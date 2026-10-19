const MAX_PDF_BYTES = 12_000_000;
const MAX_BASE64_CHARS = Math.ceil(MAX_PDF_BYTES / 3) * 4;

class BrowserVaultMaterialError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'BrowserVaultMaterialError';
    this.status = status;
  }
}

function decodeBrowserVaultMaterial(input) {
  const materialId = String(input?.materialId || '').trim();
  const source = input?.material;
  const filename = String(source?.filename || '').replace(/[\r\n\0]/g, ' ').trim().slice(0, 160);
  const subject = String(source?.subject || 'General').replace(/[\r\n\0]/g, ' ').trim().slice(0, 120) || 'General';
  const encoded = String(source?.fileBase64 || '');

  if (!materialId || materialId.length > 160) {
    throw new BrowserVaultMaterialError(400, 'Choose a file from your browser Vault.');
  }
  if (!filename.toLowerCase().endsWith('.pdf')) {
    throw new BrowserVaultMaterialError(415, 'Choose a PDF from your browser Vault.');
  }
  if (!encoded || encoded.length > MAX_BASE64_CHARS) {
    throw new BrowserVaultMaterialError(413, 'Choose a PDF smaller than 12 MB.');
  }
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new BrowserVaultMaterialError(400, 'The selected PDF could not be read. Choose it again from your Vault.');
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > MAX_PDF_BYTES) {
    throw new BrowserVaultMaterialError(413, 'Choose a PDF smaller than 12 MB.');
  }
  if (bytes.toString('base64') !== encoded) {
    throw new BrowserVaultMaterialError(400, 'The selected PDF could not be read. Choose it again from your Vault.');
  }
  if (bytes.subarray(0, 5).toString() !== '%PDF-') {
    throw new BrowserVaultMaterialError(400, 'The selected Vault file is not a valid PDF.');
  }

  return {materialId, filename, subject, bytes};
}

async function readBrowserVaultMaterial(input, extractPdfText) {
  const material = decodeBrowserVaultMaterial(input);
  const extracted = await extractPdfText(material.bytes);
  const text = String(extracted?.text || '').replace(/\0/g, '').trim();
  if (extracted?.status !== 'complete' || text.replace(/\s/g, '').length < 40) {
    throw new BrowserVaultMaterialError(422, 'Nexora could not read enough text from this PDF. Try a text-based copy or run OCR first.');
  }
  return {...material, bytes: undefined, extractedText: text};
}

module.exports = {
  MAX_PDF_BYTES,
  BrowserVaultMaterialError,
  decodeBrowserVaultMaterial,
  readBrowserVaultMaterial,
};

