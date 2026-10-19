const test = require('node:test');
const assert = require('node:assert/strict');
const {
  NvidiaOcrError,
  parseNvidiaOcrText,
  recognizeNvidiaOcrImages,
  recognizeNvidiaOcrImage,
} = require('./nvidiaOcrService');

test('reads Nemotron OCR detections in page order', () => {
  assert.equal(parseNvidiaOcrText({data: [
    {index: 1, text_detections: [{text_prediction: {text: 'Second page'}}]},
    {index: 0, text_detections: [{text_prediction: {text: 'First page'}}, {text_prediction: {text: 'Unit 1'}}]},
  ]}), 'First page\nUnit 1\nSecond page');
});

test('sends scanned page data to the configured NVIDIA endpoint with server-side auth', async () => {
  const image = Buffer.from('png image bytes');
  let request;
  const text = await recognizeNvidiaOcrImage(image, {
    apiKey: 'test-secret',
    endpoint: 'https://ocr.example.test/v1/ocr',
    fetchImpl: async (url, options) => {
      request = {url, options, body: JSON.parse(options.body)};
      return new Response(JSON.stringify({data: [{index: 0, text_detections: [{text_prediction: {text: 'Scanned syllabus text'}}]}]}), {status: 200});
    },
  });

  assert.equal(text, 'Scanned syllabus text');
  assert.equal(request.url, 'https://ocr.example.test/v1/ocr');
  assert.equal(request.options.headers.Authorization, 'Bearer test-secret');
  assert.equal(request.body.input[0].type, 'image_url');
  assert.equal(request.body.input[0].url, `data:image/png;base64,${image.toString('base64')}`);
  assert.deepEqual(request.body.merge_levels, ['paragraph']);
});

test('sends multiple scanned pages in one NVIDIA request and returns text in page order', async () => {
  const images = [Buffer.from('page one'), Buffer.from('page two')];
  let request;
  const pages = await recognizeNvidiaOcrImages(images, {
    apiKey: 'test-secret',
    endpoint: 'https://ocr.example.test/v1/ocr',
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({data: [
        {index: 1, text_detections: [{text_prediction: {text: 'Second page'}}]},
        {index: 0, text_detections: [{text_prediction: {text: 'First page'}}]},
      ]}), {status: 200});
    },
  });

  assert.equal(request.input.length, 2);
  assert.match(request.input[0].url, /^data:image\/jpeg;base64,/);
  assert.deepEqual(request.merge_levels, ['paragraph', 'paragraph']);
  assert.deepEqual(pages, ['First page', 'Second page']);
});

test('formats structured NVIDIA validation errors into readable diagnostics', async () => {
  await assert.rejects(
    recognizeNvidiaOcrImages([Buffer.from('page one'), Buffer.from('page two')], {
      apiKey: 'test-secret',
      fetchImpl: async () => new Response(JSON.stringify({
        error: {type: 'invalid_request_error'},
        detail: [{msg: 'merge_levels must contain one item per image'}, {msg: 'received 1 for 2 images'}],
      }), {status: 422}),
    }),
    error => error instanceof NvidiaOcrError &&
      /HTTP 422/.test(error.message) &&
      /merge_levels must contain one item per image/.test(error.message) &&
      /received 1 for 2 images/.test(error.message) &&
      !error.message.includes('[object Object]') &&
      !error.message.includes('test-secret'),
  );
});

test('fails clearly when the NVIDIA API key is missing', async () => {
  await assert.rejects(
    recognizeNvidiaOcrImage(Buffer.from('png'), {apiKey: ''}),
    error => error instanceof NvidiaOcrError && error.status === 503 && /NVIDIA_API_KEY/.test(error.message),
  );
});

test('does not include API credentials in provider errors', async () => {
  await assert.rejects(
    recognizeNvidiaOcrImage(Buffer.from('png'), {
      apiKey: 'do-not-leak',
      fetchImpl: async () => new Response(JSON.stringify({detail: 'Invalid API key'}), {status: 401}),
    }),
    error => error instanceof NvidiaOcrError && !error.message.includes('do-not-leak') && /NVIDIA OCR failed/.test(error.message),
  );
});
