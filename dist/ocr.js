/**
 * ocr.js — browser-side OCR for scanned PDFs.
 * Loaded after modules-shared.js (uses window.NexoraShared.api) and after
 * the PDF.js / Tesseract.js CDN scripts in index.html.
 *
 * Pipeline: PDF -> PDF.js renders each page to a <canvas> -> Tesseract.js
 * recognizes that one canvas -> text is accumulated with page markers ->
 * POSTed to the backend once, which just saves it (no OCR happens server-side).
 *
 * Exposes window.NexoraOCR.run(materialId, onProgress) -> Promise<material>
 */
(function () {
  const RENDER_SCALE = 2; // bump for sharper (slower) OCR, lower for speed
  const PDFJS_VERSION = '2.11.338';
  const inFlight = new Set(); // guards against duplicate concurrent OCR runs per material

  // PDF.js needs its worker script configured once, as soon as it's loaded.
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  }

  function requireLibs() {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js did not load. Check the script tag / network connection.');
    }
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js did not load. Check the script tag / network connection.');
    }
  }

  async function run(materialId, onProgress) {
    const notify = typeof onProgress === 'function' ? onProgress : () => {};

    if (inFlight.has(materialId)) {
      throw new Error('OCR is already running for this material.');
    }
    inFlight.add(materialId);

    let worker = null;
    try {
      requireLibs();

      notify({ stage: 'loading', message: 'Loading PDF…' });
      // authFetch attaches the Clerk session token (the PDF endpoint is login-protected).
      const res = await window.NexoraShared.authFetch(`/api/materials/${materialId}/file`);
      if (!res.ok) throw new Error('Could not load the PDF file for OCR.');
      const arrayBuffer = await res.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      notify({ stage: 'preparing', message: 'Preparing OCR…' });
      worker = await Tesseract.createWorker('eng'); // one worker, reused across every page

      const pageTexts = [];
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const percent = Math.round(((pageNum - 1) / totalPages) * 100);
        notify({
          stage: 'page',
          page: pageNum,
          totalPages,
          percent,
          message: `Page ${pageNum} of ${totalPages} — ${percent}%`,
        });

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const { data } = await worker.recognize(canvas);
        const pageText = (data?.text || '').trim();
        pageTexts.push(`--- PAGE ${pageNum} ---\n${pageText}`);

        // Release the canvas; large multi-page PDFs can otherwise pile up memory.
        canvas.width = 0;
        canvas.height = 0;
      }

      notify({ stage: 'saving', message: 'Saving extracted text…', percent: 100 });

      const combinedText = pageTexts.join('\n\n').trim();
      const nonWhitespaceLength = combinedText.replace(/\s/g, '').length;
      if (nonWhitespaceLength < 40) {
        throw new Error('No readable text was detected.');
      }

      const updated = await window.NexoraShared.api(`/api/materials/${materialId}/ocr`, {
        method: 'POST',
        body: JSON.stringify({ extractedText: combinedText }),
      });

      notify({ stage: 'done', message: 'OCR completed successfully', percent: 100 });
      return updated;
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch (_) {}
      }
      inFlight.delete(materialId);
    }
  }

  function isRunning(materialId) {
    return inFlight.has(materialId);
  }

  window.NexoraOCR = { run, isRunning };
})();