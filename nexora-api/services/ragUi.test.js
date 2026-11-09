const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '../../dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
const client = fs.readFileSync(path.join(dist, 'rag-client.js'), 'utf8');

test('loads the RAG client after shared API helpers and before the application', () => {
  const sharedIndex = html.indexOf('modules-shared.js');
  const ragIndex = html.indexOf('rag-client.js');
  const appIndex = html.indexOf('app.js?v=');
  assert.ok(sharedIndex >= 0 && ragIndex > sharedIndex && appIndex > ragIndex);
  assert.match(html, /nexora-study-session-id/);
});

test('syncs the current browser Vault and sends the session ID with chat', () => {
  assert.match(client, /\/api\/assistant\/index-material/);
  assert.match(client, /\/api\/assistant\/reconcile/);
  assert.match(client, /vaultMaterialPayload/);
  assert.match(app, /sessionId: window\.NexoraRag\?\.sessionId/);
  assert.match(app, /nexora:open-vault-source/);
  assert.match(app, /nx-chat-citation/);
  assert.match(client, /pagehide/);
});
