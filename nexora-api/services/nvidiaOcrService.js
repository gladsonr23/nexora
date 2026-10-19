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

function parseNvidiaOcrText(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .slice()
    .sort((left, right) => Number(left?.index || 0) - Number(right?.index || 0))
    .flatMap(row => Array.isArray(row?.text_detections) ? row.text_detections : [])
    .map(detection => String(detection?.text_prediction?.text || '').trim())
    .filter(Boolean)
    .join('\n');
}

async function recognizeNvidiaOcrImage(imageBytes, {
  apiKey = getNvidiaOcrConfig().apiKey,
  endpoint = getNvidiaOcrConfig().endpoint,
  fetchImpl = globalThis.fetch,
  timeoutMs = 45000,
} = {}) {
  if (!apiKey) throw new NvidiaOcrError('NVIDIA OCR is not configured. Add NVIDIA_API_KEY to the API server environment.', 503);
  if (typeof fetchImpl !== 'function') throw new NvidiaOcrError('This server does not support outbound OCR requests.', 503);
  if (!Buffer.isBuffer(imageBytes) || imageBytes.length === 0) throw new NvidiaOcrError('The scanned page image is empty.', 422);

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
        input: [{type: 'image_url', url: `data:image/png;base64,${imageBytes.toString('base64')}`}],
        merge_levels: ['paragraph'],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new NvidiaOcrError(error?.name === 'TimeoutError' ? 'NVIDIA OCR timed out while reading this page.' : 'Could not reach NVIDIA OCR.', 502);
  }

  let payload;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const message = String(payload?.detail || payload?.message || payload?.error || '').trim();
    throw new NvidiaOcrError(message ? `NVIDIA OCR failed: ${message}` : `NVIDIA OCR returned HTTP ${response.status}.`, response.status >= 400 && response.status < 500 ? 422 : 502);
  }

  return parseNvidiaOcrText(payload);
}

module.exports = {
  NVIDIA_OCR_URL,
  NvidiaOcrError,
  getNvidiaOcrConfig,
  parseNvidiaOcrText,
  recognizeNvidiaOcrImage,
};
