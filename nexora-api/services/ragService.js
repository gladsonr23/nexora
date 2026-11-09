const crypto = require('crypto');
const {createRagStore} = require('./ragStore');

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 220;
const MAX_CHUNKS = 240;
const MAX_MATERIAL_CHARS = 90000;
const TOKEN_RE = /[\p{L}\p{N}_-]+/gu;

function safeIdentity(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
}

function sessionPrefix(userId, sessionId) {
  return `nexora:rag:${safeIdentity(userId)}:${safeIdentity(sessionId)}`;
}

function splitText(text, material) {
  const normalized = String(text || '').replace(/\u0000/g, '').replace(/\r/g, '').trim().slice(0, MAX_MATERIAL_CHARS);
  const pages = normalized.split(/(?=Page\s+\d+\s*:\s*\n?)/i).filter(Boolean);
  const units = pages.length ? pages : [normalized];
  const chunks = [];
  for (const unit of units) {
    const pageMatch = unit.match(/^Page\s+(\d+)\s*:/i);
    const pageNumber = pageMatch ? Number(pageMatch[1]) : null;
    const content = unit.replace(/^Page\s+\d+\s*:\s*/i, '').trim();
    if (!content) continue;
    let start = 0;
    while (start < content.length && chunks.length < MAX_CHUNKS) {
      let end = Math.min(start + CHUNK_SIZE, content.length);
      if (end < content.length) {
        const breakAt = content.lastIndexOf('\n', end);
        if (breakAt > start + Math.floor(CHUNK_SIZE * 0.55)) end = breakAt;
      }
      const chunkText = content.slice(start, end).trim();
      if (chunkText.length >= 12) chunks.push({
        sessionId: material.sessionId,
        materialId: material.materialId,
        materialName: material.filename,
        subject: material.subject || 'General',
        pageNumber,
        chunkIndex: chunks.length,
        text: chunkText,
      });
      if (end >= content.length) break;
      start = Math.max(start + 1, end - CHUNK_OVERLAP);
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }
  return chunks;
}

function tokens(text) {
  return String(text || '').toLowerCase().match(TOKEN_RE) || [];
}

function cosine(a, b) {
  if (!Array.isArray(a) || a.length !== b?.length || !b.length) return 0;
  let dot = 0; let aa = 0; let bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

function keywordScores(query, chunks) {
  const qTokens = [...new Set(tokens(query))];
  if (!qTokens.length || !chunks.length) return chunks.map(() => 0);
  const docs = chunks.map(chunk => tokens(chunk.text));
  const averageLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const scores = docs.map(doc => {
    const frequencies = new Map();
    for (const token of doc) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    let score = 0;
    for (const token of qTokens) {
      const df = docs.reduce((count, tokensForDoc) => count + (tokensForDoc.includes(token) ? 1 : 0), 0);
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const tf = frequencies.get(token) || 0;
      score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * doc.length / averageLength));
    }
    return score;
  });
  const max = Math.max(...scores, 0);
  return scores.map(score => max ? score / max : 0);
}

function createRagService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  store = createRagStore({env, fetchImpl}),
  clock = () => Date.now(),
} = {}) {
  async function requestGemini(path, body) {
    if (!env.GEMINI_API_KEY) throw Object.assign(new Error('Gemini is not configured.'), {code: 'NO_API_KEY'});
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/${path}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(`Gemini returned ${response.status}.`), {status: response.status, provider: result?.error?.message});
    return result;
  }

  async function embedTexts(texts, taskType) {
    const batches = [];
    for (let start = 0; start < texts.length; start += 100) {
      const batch = texts.slice(start, start + 100);
      batches.push({batch, start});
    }
    const responses = await Promise.all(batches.map(async ({batch, start}) => {
      const result = await requestGemini(`models/${EMBEDDING_MODEL}:batchEmbedContents`, {
        requests: batch.map(text => ({model: `models/${EMBEDDING_MODEL}`, content: {parts: [{text}]}, taskType, outputDimensionality: 768})),
      });
      const embeddings = result.embeddings || [];
      if (embeddings.length !== batch.length || embeddings.some(item => !Array.isArray(item.values) || !item.values.length)) {
        throw new Error('Gemini returned an incomplete embedding batch.');
      }
      return {start, vectors: embeddings.map(item => item.values)};
    }));
    const vectors = [];
    for (const response of responses.sort((a, b) => a.start - b.start)) vectors.push(...response.vectors);
    return vectors;
  }

  async function indexMaterials({userId, sessionId, materials}) {
    if (!userId || !sessionId || sessionId.length > 160) throw Object.assign(new Error('A valid study session is required.'), {status: 400});
    const prefix = sessionPrefix(userId, sessionId);
    const previous = await store.get(`${prefix}:manifest`);
    const materialMap = new Map((previous?.materials || []).map(item => [item.materialId, item]));
    const obsolete = [];
    for (const material of materials.slice(0, 20)) {
      const old = materialMap.get(material.materialId);
      const usedByOtherMaterials = [...materialMap.values()]
        .filter(item => item.materialId !== material.materialId)
        .reduce((sum, item) => sum + (item.chunks?.length || 0), 0);
      const capacity = Math.max(0, MAX_CHUNKS - usedByOtherMaterials);
      const allChunks = splitText(material.extractedText, {...material, sessionId});
      const chunks = allChunks.slice(0, capacity);
      if (old?.chunks?.length) obsolete.push(...old.chunks);
      const materialHash = safeIdentity(material.materialId);
      const ids = chunks.map(chunk => `${prefix}:material:${materialHash}:chunk:${chunk.chunkIndex}`);
      if (chunks.length) {
        const vectors = await embedTexts(chunks.map(chunk => chunk.text), 'RETRIEVAL_DOCUMENT');
        await Promise.all(chunks.map((chunk, index) => store.set(ids[index], {...chunk, embedding: vectors[index]})));
      }
      materialMap.set(material.materialId, {
        materialId: material.materialId, filename: material.filename, subject: material.subject || 'General', chunks: ids,
        truncated: allChunks.length > chunks.length,
      });
    }
    const allMaterials = [...materialMap.values()];
    const allIds = allMaterials.flatMap(item => item.chunks || []);
    const manifest = {
      userId, sessionId, updatedAt: new Date(clock()).toISOString(), expiresAt: new Date(clock() + store.ttlSeconds * 1000).toISOString(),
      chunks: allIds, materials: allMaterials,
    };
    await store.set(`${prefix}:manifest`, manifest);
    const liveKeys = new Set(manifest.chunks);
    const staleKeys = obsolete.filter(key => !liveKeys.has(key));
    if (staleKeys.length) await store.delete(staleKeys);
    return {sessionId, materialCount: manifest.materials.length, chunkCount: manifest.chunks.length, expiresAt: manifest.expiresAt};
  }

  async function reconcile({userId, sessionId, materialIds}) {
    const prefix = sessionPrefix(userId, sessionId);
    const manifest = await store.get(`${prefix}:manifest`);
    if (!manifest) return {materialCount: 0, chunkCount: 0};
    const allowed = new Set(materialIds);
    const removed = (manifest.materials || []).filter(item => !allowed.has(item.materialId));
    const materials = (manifest.materials || []).filter(item => allowed.has(item.materialId));
    const deletedKeys = removed.flatMap(item => item.chunks || []);
    if (!materials.length) {
      await store.delete([...deletedKeys, `${prefix}:manifest`]);
      return {materialCount: 0, chunkCount: 0};
    }
    manifest.materials = materials;
    manifest.chunks = materials.flatMap(item => item.chunks || []);
    manifest.updatedAt = new Date(clock()).toISOString();
    manifest.expiresAt = new Date(clock() + store.ttlSeconds * 1000).toISOString();
    await store.set(`${prefix}:manifest`, manifest);
    if (deletedKeys.length) await store.delete(deletedKeys);
    return {materialCount: materials.length, chunkCount: manifest.chunks.length};
  }

  async function status({userId, sessionId}) {
    if (!userId || !sessionId) return {indexed: false, materialCount: 0, chunkCount: 0};
    const manifest = await store.get(`${sessionPrefix(userId, sessionId)}:manifest`);
    return manifest ? {indexed: true, materialCount: manifest.materials?.length || 0, chunkCount: manifest.chunks?.length || 0, expiresAt: manifest.expiresAt, materials: (manifest.materials || []).map(({materialId, filename, subject}) => ({materialId, filename, subject}))} : {indexed: false, materialCount: 0, chunkCount: 0};
  }

  async function retrieve({userId, sessionId, query, topK = 5}) {
    const manifest = await store.get(`${sessionPrefix(userId, sessionId)}:manifest`);
    if (!manifest?.chunks?.length) return [];
    const candidates = (await Promise.all(manifest.chunks.map(key => store.get(key)))).filter(Boolean);
    if (!candidates.length) return [];
    const [queryVector] = await embedTexts([query], 'RETRIEVAL_QUERY');
    const lexical = keywordScores(query, candidates);
    return candidates.map((chunk, index) => ({...chunk, score: 0.7 * Math.max(0, cosine(queryVector, chunk.embedding)) + 0.3 * lexical[index]}))
      .sort((a, b) => b.score - a.score).slice(0, topK).map(({embedding, ...chunk}) => chunk);
  }

  async function closeSession({userId, sessionId}) {
    if (!userId || !sessionId) return;
    const prefix = sessionPrefix(userId, sessionId);
    const manifest = await store.get(`${prefix}:manifest`);
    await store.delete([...(manifest?.chunks || []), `${prefix}:manifest`]);
  }

  return {indexMaterials, reconcile, status, retrieve, closeSession, embedTexts};
}

module.exports = {createRagService, splitText, cosine, keywordScores, sessionPrefix, CHUNK_SIZE, CHUNK_OVERLAP};
