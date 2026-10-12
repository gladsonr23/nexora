import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
const { langPath } = require('@tesseract.js-data/eng');

function pdfJsResourceOptions() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const directory = relative => path.resolve(projectRoot, relative).replaceAll('\\', '/') + '/';
  return {wasmUrl:directory('node_modules/pdfjs-dist/wasm'),standardFontDataUrl:directory('node_modules/pdfjs-dist/standard_fonts')};
}

/**
 * Extract text locally. Page images are rasterized in the API process and passed
 * only to the bundled Tesseract worker; no PDF or page image is sent to a provider.
 */
export async function extractPdfWithOcr(bytes) {
  const task = getDocument({data:new Uint8Array(bytes),useSystemFonts:true,...pdfJsResourceOptions()});
  const document = await task.promise;
  const pages = [];
  let worker;
  try {
    if (document.numPages > 25) throw new Error('Use a question paper with at most 25 pages.');
    for (let number=1; number<=document.numPages; number++) {
      const page=await document.getPage(number);
      try {
        const content=await page.getTextContent();
        const native=content.items.filter(item=>'str' in item).map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
        if(native.replace(/\s/g,'').length>=15){pages.push({number,text:native,source:'selectable'});continue;}
        const viewport=page.getViewport({scale:1.6});
        const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        if(!worker)worker=await createWorker('eng',1,{langPath,cacheMethod:'none'});
        const result=await worker.recognize(canvas.toBuffer('image/png'));
        const text=String(result?.data?.text||'').trim();
        pages.push({number,text,source:'ocr',agreement:null,warnings:text?[]:['Local Tesseract could not read this page.']});
      } finally { page.cleanup(); }
    }
  } finally {
    if(worker)await worker.terminate();
    await task.destroy();
  }
  return pages;
}
