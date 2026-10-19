const test = require('node:test');
const assert = require('node:assert/strict');
const {extractPdfWithOcr, joinPdfPageText, getOcrProviders} = require('./pdfOcrService');

function makePdf(textOrPages = 'A selectable syllabus page with enough readable text to avoid OCR.') {
  const texts = Array.isArray(textOrPages) ? textOrPages : [textOrPages];
  let source = '%PDF-1.4\n';
  const offsets = [0];
  const add = (number, body) => {
    offsets[number] = Buffer.byteLength(source, 'binary');
    source += `${number} 0 obj\n${body}\nendobj\n`;
  };
  add(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = texts.map((_, index) => index + 3);
  const contentIds = texts.map((_, index) => index + texts.length + 3);
  const fontId = texts.length * 2 + 3;
  add(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${texts.length} >>`);
  texts.forEach((text, index) => {
    add(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`);
    const stream = text ? `BT /F1 12 Tf 50 720 Td (${text}) Tj ET` : '';
    add(contentIds[index], `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`);
  });
  add(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xrefOffset = Buffer.byteLength(source, 'binary');
  source += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(source, 'binary');
}

test('extracts selectable PDF text without invoking remote or local OCR', async () => {
  const pages = await extractPdfWithOcr(makePdf(), {
    env: {},
    recognizeImage: async () => { throw new Error('OCR must not run for selectable text'); },
  });
  assert.equal(pages.length, 1);
  assert.match(pages[0].text, /selectable syllabus page/i);
  assert.equal(pages[0].source, 'selectable');
  assert.equal(joinPdfPageText(pages).includes('Page 1:'), true);
  assert.deepEqual(getOcrProviders(pages), []);
});

test('sends an image-only scanned page to the configured OCR provider', async () => {
  const pages = await extractPdfWithOcr(makePdf(''), {
    env: {NVIDIA_API_KEY: 'configured'},
    recognizeImage: async image => {
      assert.ok(Buffer.isBuffer(image));
      return 'Recognized scanned page text';
    },
  });
  assert.equal(pages[0].text, 'Recognized scanned page text');
  assert.equal(pages[0].source, 'nvidia');
  assert.deepEqual(getOcrProviders(pages), ['nvidia']);
});

test('fails promptly instead of starting local OCR when the preferred OCR provider fails', async () => {
  await assert.rejects(
    extractPdfWithOcr(makePdf(''), {
      env: {NVIDIA_API_KEY: 'configured'},
      fallbackToLocalOcr: false,
      recognizeImage: async () => { throw new Error('NVIDIA OCR timed out while reading this page.'); },
    }),
    /NVIDIA OCR timed out/
  );
});

test('fails clearly when local fallback is disabled and no preferred OCR key is configured', async () => {
  await assert.rejects(
    extractPdfWithOcr(makePdf(''), {env: {}, fallbackToLocalOcr: false}),
    /NVIDIA OCR is not configured/
  );
});

test('passes a shorter OCR timeout to the preferred provider when configured', async () => {
  const pages = await extractPdfWithOcr(makePdf(''), {
    env: {NVIDIA_API_KEY: 'configured'},
    nvidiaTimeoutMs: 20000,
    recognizeImages: async (images, options) => {
      assert.equal(options.timeoutMs, 20000);
      return ['Recognized scanned page text'];
    },
  });

  assert.equal(pages[0].source, 'nvidia');
});

test('batches scanned pages while preserving selectable page text and page order', async () => {
  let calls = 0;
  const pages = await extractPdfWithOcr(makePdf([
    'A selectable first page that should not be sent to the OCR provider.',
    '',
    '',
  ]), {
    env: {NVIDIA_API_KEY: 'configured'},
    recognizeImages: async images => {
      calls += 1;
      assert.equal(images.length, 2);
      return ['Recognized second page', 'Recognized third page'];
    },
  });

  assert.equal(calls, 1);
  assert.deepEqual(pages.map(page => page.number), [1, 2, 3]);
  assert.equal(pages[0].source, 'selectable');
  assert.equal(pages[1].text, 'Recognized second page');
  assert.equal(pages[2].text, 'Recognized third page');
});
