const test = require('node:test');
const assert = require('node:assert/strict');
const {extractPdfWithOcr, joinPdfPageText, getOcrProviders} = require('./pdfOcrService');

function makePdf(text = 'A selectable syllabus page with enough readable text to avoid OCR.') {
  let source = '%PDF-1.4\n';
  const offsets = [0];
  const add = (number, body) => {
    offsets[number] = Buffer.byteLength(source, 'binary');
    source += `${number} 0 obj\n${body}\nendobj\n`;
  };
  const stream = text ? `BT /F1 12 Tf 50 720 Td (${text}) Tj ET` : '';
  add(1, '<< /Type /Catalog /Pages 2 0 R >>');
  add(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
  add(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  add(5, `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`);
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
