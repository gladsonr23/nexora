const path = require('node:path');
const {langPath} = require('@tesseract.js-data/eng');
const {getNvidiaOcrConfig, recognizeNvidiaOcrImage} = require('./nvidiaOcrService');

const MAX_OCR_PAGES = 25;
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
  recognizeImage = recognizeNvidiaOcrImage,
  env = process.env,
} = {}) {
  const [{createCanvas}, {createWorker}, {getDocument}] = await Promise.all([
    import('@napi-rs/canvas'), import('tesseract.js'), loadPdfJs(),
  ]);
  const task = getDocument({data: new Uint8Array(bytes), useSystemFonts: true, ...pdfJsResourceOptions()});
  const document = await task.promise;
  const pages = [];
  let worker;
  const nvidiaConfigured = Boolean(getNvidiaOcrConfig(env).apiKey);

  try {
    if (document.numPages > MAX_OCR_PAGES) throw new Error(`Use a PDF with at most ${MAX_OCR_PAGES} pages for OCR.`);
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      try {
        const content = await page.getTextContent();
        const nativeText = content.items.filter(item => 'str' in item).map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
        if (nativeText.replace(/\s/g, '').length >= 15) {
          pages.push({number, text: nativeText, source: 'selectable'});
          continue;
        }

        const viewport = page.getViewport({scale: 1.6});
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
        const imageBytes = canvas.toBuffer('image/png');
        let text = '';
        let source = 'tesseract';
        const warnings = [];

        if (nvidiaConfigured) {
          try {
            text = String(await recognizeImage(imageBytes)).trim();
            if (text) source = 'nvidia';
            else warnings.push('NVIDIA OCR returned no text; local OCR fallback was used.');
          } catch (error) {
            warnings.push(error?.message || 'NVIDIA OCR failed; local OCR fallback was used.');
          }
        }

        if (!text) {
          if (!worker) worker = await createWorker('eng', 1, {langPath, cacheMethod: 'none'});
          const result = await worker.recognize(imageBytes);
          text = String(result?.data?.text || '').trim();
          source = 'tesseract';
        }

        if (!text) warnings.push('OCR could not read this page.');
        pages.push({number, text, source, warnings});
      } finally {
        page.cleanup();
      }
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

module.exports = {MAX_OCR_PAGES, extractPdfWithOcr, extractPdfTextWithOcr, joinPdfPageText, getOcrProviders};
