const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Below this many characters of real extracted text, we treat the PDF as
// likely scanned/image-only rather than pretending we got usable text.
const MIN_TEXT_LENGTH_FOR_SUCCESS = 40;

/**
 * Extracts text from a PDF (Buffer or path on disk), tagging each page ("Page N:\n...") so
 * downstream consumers (quiz generation, citations) can reason about which
 * page content came from. Returns { pageCount, text, status }.
 * status is one of: 'complete' | 'needs_ocr' | 'failed'.
 */
async function extractPdfText(input) {
  try {
    // Accepts an in-memory Buffer (Supabase-backed Vault) or a file path (legacy).
    const raw = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
    // The pdf.js bundled in pdf-parse 1.x misreads small Buffers that live in Node's
    // shared memory pool (byteOffset != 0). An exactly-sized copy avoids that.
    const dataBuffer = new Uint8Array(raw);
    const pages = [];

    // pdf-parse calls `pagerender` once per page during parsing, which lets
    // us capture text per page instead of one big undifferentiated blob.
    const options = {
      pagerender: async (pageData) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        pages.push(pageText.trim());
        return pageText;
      },
    };

    const result = await pdfParse(dataBuffer, options);
    const pageCount = result.numpages || pages.length || 0;

    const combinedText = pages
      .map((text, idx) => `Page ${idx + 1}:\n${text}`)
      .join('\n\n')
      .trim();

    const totalChars = pages.join('').replace(/\s/g, '').length;

    if (totalChars < MIN_TEXT_LENGTH_FOR_SUCCESS) {
      return {
        pageCount,
        text: combinedText,
        status: 'needs_ocr',
      };
    }

    return {
      pageCount,
      text: combinedText,
      status: 'complete',
    };
  } catch (err) {
    console.error('[pdfService] extraction failed:', err.message);
    return { pageCount: 0, text: '', status: 'failed' };
  }
}

/**
 * Pulls a reasonably sized slice of extracted text for sending to Gemini,
 * optionally filtered to pages/sections mentioning a topic keyword.
 * Keeps prompts bounded even for large documents.
 */
function getTextForPrompt(fullText, { maxChars = 18000, topic = null } = {}) {
  if (!fullText) return '';
  if (!topic) return fullText.slice(0, maxChars);

  const pages = fullText.split(/\n\n(?=Page \d+:)/g);
  const matching = pages.filter((p) => p.toLowerCase().includes(topic.toLowerCase()));
  const source = matching.length > 0 ? matching.join('\n\n') : fullText;
  return source.slice(0, maxChars);
}

module.exports = { extractPdfText, getTextForPrompt };