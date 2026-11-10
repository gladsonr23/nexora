const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '../../dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
const client = fs.readFileSync(path.join(dist, 'rag-client.js'), 'utf8');
const markdown = fs.readFileSync(path.join(dist, 'assistant-markdown.js'), 'utf8');

test('creates a fresh browser session and loads the RAG client before the application', () => {
  const sharedIndex = html.indexOf('modules-shared.js');
  const ragIndex = html.indexOf('rag-client.js');
  const markdownIndex = html.indexOf('assistant-markdown.js');
  const appIndex = html.indexOf('app.js?v=');
  assert.ok(sharedIndex >= 0 && ragIndex > sharedIndex && markdownIndex > ragIndex && appIndex > markdownIndex);
  assert.match(html, /const sessionId = crypto\.randomUUID\(\)/);
  assert.match(html, /nexora-study-session-active:/);
});

test('syncs only this session\'s browser Vault and sends the session ID with chat', () => {
  assert.match(client, /\/api\/assistant\/index-material/);
  assert.match(client, /\/api\/assistant\/reconcile/);
  assert.match(client, /vaultMaterialPayload/);
  assert.match(client, /await store\.ready/);
  assert.match(client, /item\.sessionId === sessionId/);
  assert.match(app, /sessionId: window\.NexoraRag\?\.sessionId/);
  assert.match(app, /nexora:open-vault-source/);
  assert.match(app, /NexoraAssistantMarkdown\?\.render/);
  assert.match(markdown, /nx-chat-citation/);
  assert.match(client, /pagehide/);
});
