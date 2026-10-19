const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BrowserVaultMaterialError,
  decodeBrowserVaultMaterial,
  readBrowserVaultMaterial,
} = require('./browserVaultMaterial');

function requestFor(bytes = Buffer.from('%PDF-1.7 sample PDF bytes')) {
  return {
    materialId: 'vault-file-1',
    material: {
      filename: 'Syllabus.pdf',
      subject: 'Computer Science',
      fileBase64: bytes.toString('base64'),
    },
  };
}

test('decodes a valid browser Vault PDF without writing it to server storage', () => {
  const input = requestFor();
  const decoded = decodeBrowserVaultMaterial(input);
  assert.equal(decoded.materialId, 'vault-file-1');
  assert.equal(decoded.filename, 'Syllabus.pdf');
  assert.equal(decoded.subject, 'Computer Science');
  assert.deepEqual(decoded.bytes, Buffer.from('%PDF-1.7 sample PDF bytes'));
});

test('rejects non-PDF files before extraction', () => {
  assert.throws(
    () => decodeBrowserVaultMaterial(requestFor(Buffer.from('not a PDF'))),
    error => error instanceof BrowserVaultMaterialError && error.status === 400,
  );
});

test('rejects malformed base64 and missing material ids', () => {
  const malformed = requestFor();
  malformed.material.fileBase64 = '%%%';
  assert.throws(() => decodeBrowserVaultMaterial(malformed), /could not be read/i);
  assert.throws(() => decodeBrowserVaultMaterial({...requestFor(), materialId: ''}), /Choose a file/i);
});

test('uses the PDF text extractor and returns text plus browser Vault metadata', async () => {
  const input = requestFor();
  let receivedBytes;
  const result = await readBrowserVaultMaterial(input, async bytes => {
    receivedBytes = bytes;
    return {status: 'complete', text: 'This is enough extracted syllabus text to create a study plan.'};
  });
  assert.deepEqual(receivedBytes, Buffer.from('%PDF-1.7 sample PDF bytes'));
  assert.equal(result.materialId, 'vault-file-1');
  assert.equal(result.subject, 'Computer Science');
  assert.equal(result.extractedText, 'This is enough extracted syllabus text to create a study plan.');
  assert.equal(result.bytes, undefined);
});

test('returns a clear OCR message when PDF parsing finds no usable text', async () => {
  await assert.rejects(
    readBrowserVaultMaterial(requestFor(), async () => ({status: 'needs_ocr', text: ''})),
    error => error instanceof BrowserVaultMaterialError && error.status === 422 && /OCR/i.test(error.message),
  );
});

test('uses the OCR fallback for a scanned browser Vault PDF', async () => {
  let ocrBytes;
  const result = await readBrowserVaultMaterial(
    requestFor(),
    async () => ({status: 'needs_ocr', text: ''}),
    async bytes => {
      ocrBytes = bytes;
      return {status: 'complete', text: 'OCR extracted enough syllabus text for planning and quiz generation.'};
    },
  );
  assert.deepEqual(ocrBytes, Buffer.from('%PDF-1.7 sample PDF bytes'));
  assert.match(result.extractedText, /^OCR extracted/);
});
