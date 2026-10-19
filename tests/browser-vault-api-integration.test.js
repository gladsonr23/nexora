const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const express = require('../nexora-api/node_modules/express');

const dataDir = path.join(os.tmpdir(), `nexora-local-vault-test-${randomUUID()}`);
process.env.NEXORA_DATA_DIR = dataDir;
process.env.GEMINI_API_KEY = 'test-key';

const authPath = require.resolve('../nexora-api/middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    requireAuth(req, res, next) { req.auth = {userId: 'test-user'}; next(); },
    optionalAuth(req, res, next) { req.auth = {userId: 'test-user'}; next(); },
  },
};

const scheduleRouter = require('../nexora-api/routes/schedule');
const quizzesRouter = require('../nexora-api/routes/quizzes');
const {db} = require('../nexora-api/db/database');

function makePdf() {
  let source = '%PDF-1.4\n';
  const offsets = [0];
  const add = (number, body) => {
    offsets[number] = Buffer.byteLength(source, 'binary');
    source += `${number} 0 obj\n${body}\nendobj\n`;
  };
  const text = 'Syllabus: Unit One. Networking basics, protocol layers, routing and switching concepts.';
  const stream = `BT /F1 12 Tf 50 720 Td (${text}) Tj ET`;
  add(1, '<< /Type /Catalog /Pages 2 0 R >>');
  add(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
  add(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  add(5, `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`);
  const xrefOffset = Buffer.byteLength(source, 'binary');
  source += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(source, 'binary');
}

const server = express()
  .use(express.json({limit: '16mb'}))
  .use('/api/schedule', scheduleRouter)
  .use('/api/quizzes', quizzesRouter)
  .listen(0, '127.0.0.1');

const originalFetch = global.fetch;
global.fetch = async (_url, options) => {
  const request = JSON.parse(options.body);
  const prompt = request.systemInstruction?.parts?.[0]?.text || '';
  const result = prompt.includes('extracts structured academic syllabus')
    ? {subject: 'Networks', units: [{unit: 'Unit One', topics: ['Networking basics', 'Protocol layers']}], deadlines: []}
    : {questions: [{question: 'Which concept describes routing?', options: ['Path selection', 'File storage', 'Text formatting', 'Audio mixing'], correctAnswer: 0, explanation: 'Routing chooses paths.'}]};
  return new Response(JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify(result)}]}}]}), {
    status: 200,
    headers: {'content-type': 'application/json'},
  });
};

test('browser Vault PDF requests reach Schedule and Quiz generation without a server Vault row', async () => {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pdf = makePdf();
  const shared = {
    materialId: 'local-vault-uuid',
    material: {filename: 'Syllabus.pdf', subject: 'Networks', fileBase64: pdf.toString('base64')},
  };
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 10);
  const date = `${examDate.getFullYear()}-${String(examDate.getMonth() + 1).padStart(2, '0')}-${String(examDate.getDate()).padStart(2, '0')}`;

  const scheduleResponse = await originalFetch(`${baseUrl}/api/schedule/generate`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({...shared, examDate: date, availableHours: 2, studyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}),
  });
  const scheduleText = await scheduleResponse.text();
  assert.equal(scheduleResponse.status, 201, scheduleText);
  const plan = JSON.parse(scheduleText);
  assert.equal(plan.subject, 'Networks');
  assert.ok(plan.planId);
  assert.ok(plan.tasks.length > 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schedules').get().count, 0);

  const quizResponse = await originalFetch(`${baseUrl}/api/quizzes/generate`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({...shared, topic: 'All', questionType: 'mcq', difficulty: 'medium', questionCount: 1}),
  });
  const quizText = await quizResponse.text();
  assert.equal(quizResponse.status, 201, quizText);
  const quiz = JSON.parse(quizText);
  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.questions[0].correctAnswer, 0);
  assert.ok(quiz.quizId);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM quizzes').get().count, 0);
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  global.fetch = originalFetch;
  db.close();
  await fs.promises.rm(dataDir, {recursive: true, force: true});
});
