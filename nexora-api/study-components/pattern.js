

const STOP_WORDS = new Set('a an and are as at be between by can compare define describe difference differentiate discuss do does explain for from give how in into is it its list mention of on or outline the their to what which with write you your short note notes advantages disadvantages following'.split(' '));

function inferExamYear(filename, supplied = '') {
  const fromFilename = String(filename || '').match(/(?:^|\D)(20\d{2})(?=\D|$)/)?.[1];
  if (fromFilename) return fromFilename;
  return String(supplied || '').match(/(?:^|\D)(20\d{2})(?=\D|$)/)?.[1] || '';
}

async function extractPdfPages(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const document = await task.promise;
  const pages = [];
  try {
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const lines = [];
      let row = [];
      let previousY = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform?.[5] ?? 0;
        if (row.length && Math.abs(y - previousY) > 3) {
          lines.push(row.map(part => part.str).join(' ').replace(/\s+/g, ' ').trim());
          row = [];
        }
        row.push(item);
        previousY = y;
        if (item.hasEOL) {
          lines.push(row.map(part => part.str).join(' ').replace(/\s+/g, ' ').trim());
          row = [];
          previousY = null;
        }
      }
      if (row.length) lines.push(row.map(part => part.str).join(' ').replace(/\s+/g, ' ').trim());
      pages.push({ number, text: lines.filter(Boolean).join('\n') });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

function questionStart(line) {
  const match = line.match(/^\s*(?:(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,2})(?:\s*[.):\-]|\s+(?=[A-Z]))\s*)(.+)$/i);
  if (!match) return null;
  const text = match[2].trim();
  if (!isQuestionStemLine(text) || /^\d/.test(text)) return null;
  return { number: Number(match[1]), text };
}

function questionNumberOnly(line) {
  const match = String(line).match(/^\s*(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,2})\s*[.):\-]?\s*$/i);
  return match ? Number(match[1]) : null;
}

function isQuestionStemLine(line) {
  const text = String(line || '').trim();
  const option = /^(?:\([A-D]\)|[A-D][).:])\s/i.test(text);
  const header = /^(?:page\s+\d+|section\b|part\s*(?:[-:][A-C])?\b|time\s*:|maximum\s+marks|marks\b|answer\s+all\b|instructions?\s*:)/i.test(text);
  return text.length >= 8 && /[a-z]/i.test(text) && !option && !header;
}

function isLikelyQuestionStemLine(line) {
  return isQuestionStemLine(line) && /^(?:the|what|how|find|write|state|solve|prove|derive|evaluate|show|determine|calculate|obtain|expand|using|for|in|if|let|given|which|why|when|consider|explain|define|compute|transform|fourier|z[ -]?transform|a|an|at|verify|establish|discuss|draw|list)\b/i.test(String(line).trim());
}

function extractMarks(text) {
  const patterns = [
    /\[\s*(\d{1,2})\s*(?:marks?|m)?\s*\]\s*$/i,
    /\(\s*(\d{1,2})\s*(?:marks?|m)\s*\)\s*$/i,
    /\bmarks?\s*[:=]\s*(\d{1,2})\s*$/i,
    /\s+(\d{1,2})\s*(?:marks?|m)\s*$/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return { text: text.slice(0, match.index).trim(), marks: Number(match[1]) };
  }
  return { text: text.trim(), marks: null };
}

function parseQuestionPaper(pages, metadata = {}) {
  const questions = [];
  let current = null;
  let pendingNumber = null;
  const flush = () => {
    if (!current) return;
    const cleaned = extractMarks(current.parts.join(' ').replace(/\s+/g, ' '));
    if (cleaned.text.length >= 12) questions.push({
      text: cleaned.text.slice(0, 900), marks: cleaned.marks, page: current.page,
      number: current.number
    });
    current = null;
  };
  for (const page of pages) {
    for (const raw of String(page.text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const start = questionStart(line);
      if (start) {
        if (pendingNumber?.number === start.number) pendingNumber = null;
        flush();
        current = { number: start.number, page: page.number, parts: [start.text] };
        continue;
      }
      const isolatedNumber = questionNumberOnly(line);
      if (isolatedNumber !== null && isolatedNumber > 0) {
        if (current?.number === isolatedNumber) continue;
        flush();
        pendingNumber = { number: isolatedNumber, page: page.number, skippedLines: 0 };
        continue;
      }
      if (pendingNumber) {
        if (isLikelyQuestionStemLine(line)) {
          current = { number: pendingNumber.number, page: pendingNumber.page, parts: [line] };
          pendingNumber = null;
        } else if (++pendingNumber.skippedLines > 2) {
          pendingNumber = null;
        }
        continue;
      } else if (current && !/^(?:page\s+\d+|section\s+[a-z]|time\s*:|maximum\s+marks|instructions?\s*:)/i.test(line)) {
        current.parts.push(line);
      }
    }
  }
  flush();
  const deduplicated = [];
  for (const question of questions) {
    const duplicate = deduplicated.find(existing => existing.page === question.page && existing.number === question.number &&
      (similarity(existing.text, question.text) >= 0.72 || existing.text.toLowerCase().includes(question.text.toLowerCase()) || question.text.toLowerCase().includes(existing.text.toLowerCase())));
    if (!duplicate) deduplicated.push(question);
    else if (question.text.length > duplicate.text.length) {
      duplicate.text = question.text;
      duplicate.marks ??= question.marks;
    } else {
      duplicate.marks ??= question.marks;
    }
  }
  return {
    filename: String(metadata.filename || 'Question paper').slice(0, 120),
    year: String(metadata.year || '').slice(0, 20),
    questions: deduplicated,
    pageCount: pages.length
  };
}

function tokens(text) {
  return [...new Set(String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 2 && !STOP_WORDS.has(word)).map(word => word.endsWith('s') && word.length > 4 ? word.slice(0, -1) : word))];
}

function similarity(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.length || !right.length) return 0;
  const overlap = left.filter(word => right.includes(word)).length;
  if (left.length <= 2 || right.length <= 2) return overlap === left.length && overlap === right.length ? 1 : 0;
  return overlap >= 3 ? overlap / new Set([...left, ...right]).size : 0;
}

function topicName(text) {
  const words = tokens(text).filter(word => !/^\d+$/.test(word));
  if (!words.length) return 'Other topics';
  return words.slice(0, 3).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function analyzeQuestionPapers(papers) {
  const groups = [];
  const cleanPapers = papers.filter(paper => paper && Array.isArray(paper.questions));
  for (const [paperIndex, paper] of cleanPapers.entries()) {
    for (const [questionIndex, question] of paper.questions.entries()) {
      const text = String(question.text || '').replace(/\s+/g, ' ').trim().slice(0, 900);
      if (text.length < 12) continue;
      let group = groups.find(candidate => similarity(candidate.question, text) >= 0.72);
      if (!group) {
        group = { id: `q-${groups.length + 1}`, question: text, topic: topicName(text), occurrences: [] };
        groups.push(group);
      }
      const marks = Number(question.marks);
      group.occurrences.push({ paperIndex, questionIndex, number: Number(question.number) || null, paper: String(paper.filename || 'Question paper'), year: String(paper.year || ''), page: Number(question.page) || 1, marks: Number.isFinite(marks) && marks > 0 && marks <= 100 ? marks : null, markSource: question.markSource === 'manual' ? 'manual' : 'detected' });
    }
  }
  const result = groups.map(group => {
    const paperCount = new Set(group.occurrences.map(item => item.paperIndex)).size;
    const knownMarks = group.occurrences.filter(item => item.marks !== null);
    return { ...group, topic: group.topic, count: group.occurrences.length, paperCount,
      repeatRate: cleanPapers.length ? Math.round(100 * paperCount / cleanPapers.length) : 0,
      totalMarks: knownMarks.reduce((sum, item) => sum + item.marks, 0), marksKnown: knownMarks.length };
  }).sort((a, b) => b.paperCount - a.paperCount || b.count - a.count || b.totalMarks - a.totalMarks);
  const totalQuestions = result.reduce((sum, group) => sum + group.count, 0);
  return { paperCount: cleanPapers.length, totalQuestions, groups: result,
    repeatedGroups: result.filter(group => group.paperCount > 1).length,
    marksKnown: result.reduce((sum, group) => sum + group.marksKnown, 0) };
}

module.exports = { inferExamYear, extractPdfPages, parseQuestionPaper, analyzeQuestionPapers };
