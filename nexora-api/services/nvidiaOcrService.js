const NVIDIA_OCR_URL = 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2';

class NvidiaOcrError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'NvidiaOcrError';
    this.status = status;
  }
}

function getNvidiaOcrConfig(env = process.env) {
  return {
    apiKey: String(env.NVIDIA_API_KEY || '').trim(),
    endpoint: String(env.NVIDIA_OCR_ENDPOINT || NVIDIA_OCR_URL).trim(),
  };
}

function parseNvidiaOcrPages(payload, expectedCount = 0) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const pages = Array.from({length: Math.max(expectedCount, rows.length)}, () => '');
  for (const [position, row] of rows.entries()) {
    const index = Number.isInteger(Number(row?.index)) ? Number(row.index) : position;
    if (index < 0 || index >= pages.length) continue;
    pages[index] = (Array.isArray(row?.text_detections) ? row.text_detections : [])
      .map(detection => String(detection?.text_prediction?.text || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return pages;
}

function parseNvidiaOcrText(payload) {
  return parseNvidiaOcrPages(payload).filter(Boolean).join('\n');
}

function errorText(value, depth = 0) {
  if (depth > 5 || value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(item => errorText(item, depth + 1)).filter(Boolean).join('; ');
  if (typeof value !== 'object') return '';
  for (const key of ['message', 'msg', 'detail', 'error', 'title', 'reason']) {
    const message = errorText(value[key], depth + 1);
    if (message) return message;
  }
  return '';
}

async function recognizeNvidiaOcrImages(imageBytesList, {
  apiKey = getNvidiaOcrConfig().apiKey,
  endpoint = getNvidiaOcrConfig().endpoint,
  fetchImpl = globalThis.fetch,
  timeoutMs = 45000,
  mimeType = 'image/jpeg',
} = {}) {
  if (!apiKey) throw new NvidiaOcrError('NVIDIA OCR is not configured. Add NVIDIA_API_KEY to the API server environment.', 503);
  if (typeof fetchImpl !== 'function') throw new NvidiaOcrError('This server does not support outbound OCR requests.', 503);
  if (!Array.isArray(imageBytesList) || imageBytesList.length === 0 || imageBytesList.some(image => !Buffer.isBuffer(image) || image.length === 0)) {
    throw new NvidiaOcrError('One or more scanned page images are empty.', 422);
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: imageBytesList.map(imageBytes => ({type: 'image_url', url: `data:${mimeType};base64,${imageBytes.toString('base64')}`})),
        merge_levels: imageBytesList.map(() => 'paragraph'),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new NvidiaOcrError(error?.name === 'TimeoutError' ? 'NVIDIA OCR timed out while reading this page.' : 'Could not reach NVIDIA OCR.', 502);
  }

  let payload;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const message = errorText(payload?.detail) || errorText(payload?.message) || errorText(payload?.error) || errorText(payload);
    const safeMessage = message.replaceAll(apiKey, '[redacted]').slice(0, 500);
    throw new NvidiaOcrError(safeMessage ? `NVIDIA OCR failed (HTTP ${response.status}): ${safeMessage}` : `NVIDIA OCR returned HTTP ${response.status}.`, response.status >= 400 && response.status < 500 ? 422 : 502);
  }

  return parseNvidiaOcrPages(payload, imageBytesList.length);
}

async function recognizeNvidiaOcrImage(imageBytes, options = {}) {
  const [text] = await recognizeNvidiaOcrImages([imageBytes], {
    ...options,
    mimeType: options.mimeType || 'image/png',
  });
  return text || '';
}

module.exports = {
  NVIDIA_OCR_URL,
  NvidiaOcrError,
  getNvidiaOcrConfig,
  parseNvidiaOcrPages,
  parseNvidiaOcrText,
  recognizeNvidiaOcrImages,
  recognizeNvidiaOcrImage,
};
