const path = require('node:path');
const {langPath} = require('@tesseract.js-data/eng');
const {getNvidiaOcrConfig, recognizeNvidiaOcrImage, recognizeNvidiaOcrImages} = require('./nvidiaOcrService');

const MAX_OCR_PAGES = 25;
const OCR_BATCH_SIZE = 4;
const OCR_BATCH_CONCURRENCY = 2;
let pdfJsPromise;

function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ]).then(([pdfjs, worker]) => {
      globalThis.pdfjsWorker = {WorkerMessageHandler: worker.WorkerMessageHandler};
      return pdfjs;
    });
  }
  return pdfJsPromise;
}

function pdfJsResourceOptions() {
  const projectRoot = path.resolve(__dirname, '..');
  const directory = relative => path.resolve(projectRoot, relative).replaceAll('\\', '/') + '/';
  return {wasmUrl: directory('node_modules/pdfjs-dist/wasm'), standardFontDataUrl: directory('node_modules/pdfjs-dist/standard_fonts')};
}

async function extractPdfWithOcr(bytes, {
  recognizeImages,
  recognizeImage = recognizeNvidiaOcrImage,
  env = process.env,
} = {}) {
  const [{createCanvas}, {createWorker}, {getDocument}] = await Promise.all([
    import('@napi-rs/canvas'), import('tesseract.js'), loadPdfJs(),
  ]);
  const task = getDocument({data: new Uint8Array(bytes), useSystemFonts: true, ...pdfJsResourceOptions()});
  const document = await task.promise;
  const pages = Array(document.numPages);
  const scannedPages = [];
  let worker;
  const nvidiaConfigured = Boolean(getNvidiaOcrConfig(env).apiKey);
  const recognizeBatch = recognizeImages || (recognizeImage !== recognizeNvidiaOcrImage
    ? async images => Promise.all(images.map(image => recognizeImage(image)))
    : recognizeNvidiaOcrImages);

  try {
    if (document.numPages > MAX_OCR_PAGES) throw new Error(`Use a PDF with at most ${MAX_OCR_PAGES} pages for OCR.`);
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      try {
        const content = await page.getTextContent();
        const nativeText = content.items.filter(item => 'str' in item).map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
        if (nativeText.replace(/\s/g, '').length >= 15) {
          pages[number - 1] = {number, text: nativeText, source: 'selectable'};
          continue;
        }

        const viewport = page.getViewport({scale: 1.6});
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
        scannedPages.push({number, imageBytes: canvas.toBuffer('image/jpeg', 0.85)});
      } finally {
        page.cleanup();
      }
    }

    const fallbackPages = [];
    if (nvidiaConfigured) {
      const windowSize = OCR_BATCH_SIZE * OCR_BATCH_CONCURRENCY;
      for (let start = 0; start < scannedPages.length; start += windowSize) {
        const window = scannedPages.slice(start, start + windowSize);
        const batches = [];
        for (let index = 0; index < window.length; index += OCR_BATCH_SIZE) {
          batches.push(window.slice(index, index + OCR_BATCH_SIZE));
        }
        const results = await Promise.all(batches.map(async batch => {
          try {
            return {batch, texts: await recognizeBatch(batch.map(page => page.imageBytes), {mimeType: 'image/jpeg'})};
          } catch (error) {
            return {batch, error};
          }
        }));
        for (const {batch, texts = [], error} of results) {
          batch.forEach((scanned, index) => {
            const text = String(texts[index] || '').trim();
            if (text) pages[scanned.number - 1] = {number: scanned.number, text, source: 'nvidia'};
            else fallbackPages.push({
              ...scanned,
              warnings: [error?.message || 'NVIDIA OCR returned no text; local OCR fallback was used.'],
            });
          });
        }
      }
    } else {
      fallbackPages.push(...scannedPages);
    }

    for (const scanned of fallbackPages) {
      if (!worker) worker = await createWorker('eng', 1, {langPath, cacheMethod: 'none'});
      const result = await worker.recognize(scanned.imageBytes);
      const text = String(result?.data?.text || '').trim();
      const warnings = [...(scanned.warnings || [])];
      if (!text) warnings.push('OCR could not read this page.');
      pages[scanned.number - 1] = {number: scanned.number, text, source: 'tesseract', warnings};
    }
  } finally {
    if (worker) await worker.terminate();
    await task.destroy();
  }

  return pages;
}

function joinPdfPageText(pages) {
  return pages.map(page => `Page ${page.number}:\n${String(page.text || '').trim()}`).filter(page => !page.endsWith('\n')).join('\n\n').trim();
}

function getOcrProviders(pages) {
  return [...new Set(pages.map(page => page.source).filter(source => source === 'nvidia' || source === 'tesseract'))];
}

async function extractPdfTextWithOcr(bytes, options) {
  const pages = await extractPdfWithOcr(bytes, options);
  return {status: 'complete', text: joinPdfPageText(pages), pages, providers: getOcrProviders(pages)};
}

module.exports = {MAX_OCR_PAGES, OCR_BATCH_SIZE, OCR_BATCH_CONCURRENCY, extractPdfWithOcr, extractPdfTextWithOcr, joinPdfPageText, getOcrProviders};
