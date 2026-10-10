const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash';

const API_KEY =
  process.env.GEMINI_API_KEY;

const BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';


class GeminiError extends Error {
  constructor(
    message,
    code = 'GEMINI_ERROR'
  ) {
    super(message);
    this.code = code;
  }
}


function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}


function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


/**
 * Sends a request to one Gemini model.
 *
 * Primary model:
 *   gemini-3.1-flash-lite
 *
 * Fallback model:
 *   gemini-3.8-flash
 */
async function requestGemini(
  model,
  systemPrompt,
  userPrompt
) {
  const url =
    `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: userPrompt
          }
        ]
      }
    ],

    systemInstruction: {
      role: 'system',
      parts: [
        {
          text: systemPrompt
        }
      ]
    },

    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4
    }
  };


  /*
   * Keep retries low so NoteToQuiz
   * doesn't become unnecessarily slow.
   *
   * 0 = first request
   * 1 = one retry
   */
  const MAX_RETRIES = 1;


  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    let response;


    try {

      response = await fetch(url, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(body)
      });

    } catch (err) {

      throw new GeminiError(
        `Could not reach Gemini API: ${err.message}`,
        'NETWORK_ERROR'
      );

    }


    /*
     * Successful response.
     */
    if (response.ok) {

      const data =
        await response.json();

      const text =
        data?.candidates?.[0]
          ?.content?.parts
          ?.map(p => p.text)
          .join('') || '';


      if (!text) {

        throw new GeminiError(
          'Gemini returned an empty response.',
          'EMPTY_RESPONSE'
        );

      }


      return text;
    }


    /*
     * Read provider error.
     */
    const errText =
      await response
        .text()
        .catch(() => '');


    /*
     * These errors are temporary and may
     * succeed on another attempt.
     */
    const temporaryError =
      [
        429,
        500,
        502,
        503,
        504
      ].includes(response.status);


    /*
     * Retry temporary errors once.
     *
     * Delay:
     *   500ms
     */
    if (
      temporaryError &&
      attempt < MAX_RETRIES
    ) {

      const delay =
        500 * Math.pow(2, attempt);


      console.warn(
        `[geminiService] ${model} returned ${response.status}. ` +
        `Retrying in ${delay}ms... ` +
        `(attempt ${attempt + 1}/${MAX_RETRIES})`
      );


      await sleep(delay);

      continue;
    }


    /*
     * Return a structured error so
     * callGemini() can decide whether
     * to use the fallback model.
     */
    const error =
      new GeminiError(
        `Gemini API returned ${response.status}: ${errText.slice(0, 500)}`,
        'API_ERROR'
      );

    error.status =
      response.status;

    throw error;
  }
}


/**
 * Calls Gemini using the primary model.
 *
 * Primary:
 *   gemini-3.1-flash-lite
 *
 * Fallback:
 *   gemini-3.8-flash
 *
 * The fallback is only used when the
 * primary model has a temporary provider
 * availability problem.
 */
async function callGemini(
  systemPrompt,
  userPrompt
) {

  if (!API_KEY) {

    throw new GeminiError(
      'GEMINI_API_KEY is not set. Add it to .env to enable AI generation.',
      'NO_API_KEY'
    );

  }


  /*
   * Try the fast Flash-Lite model first.
   */
  try {

    console.log(
      `[geminiService] Using primary model: ${GEMINI_MODEL}`
    );


    return await requestGemini(
      GEMINI_MODEL,
      systemPrompt,
      userPrompt
    );

  } catch (primaryError) {


    /*
     * Only use fallback for temporary
     * provider availability problems.
     */
    const shouldFallback =
      [
        429,
        500,
        502,
        503,
        504
      ].includes(primaryError.status);


    if (
      !shouldFallback ||
      FALLBACK_MODEL === GEMINI_MODEL
    ) {

      throw primaryError;

    }


    console.warn(
      `[geminiService] ${GEMINI_MODEL} is unavailable ` +
      `(${primaryError.status}). ` +
      `Switching to fallback model: ${FALLBACK_MODEL}`
    );


    try {

      return await requestGemini(
        FALLBACK_MODEL,
        systemPrompt,
        userPrompt
      );

    } catch (fallbackError) {

      throw new GeminiError(
        `Primary model ${GEMINI_MODEL} and fallback model ` +
        `${FALLBACK_MODEL} both failed. ` +
        `Last error: ${fallbackError.message}`,
        'API_ERROR'
      );

    }
  }
}


/**
 * Calls Gemini and parses the result as JSON.
 *
 * If the first response is malformed JSON,
 * Gemini is called again with a repair prompt.
 */
async function generateJson(
  systemPrompt,
  userPrompt
) {

  const raw =
    await callGemini(
      systemPrompt,
      userPrompt
    );


  try {

    return JSON.parse(
      stripCodeFences(raw)
    );

  } catch (firstErr) {

    console.warn(
      '[geminiService] first response was not valid JSON, ' +
      'retrying with repair prompt'
    );


    const repairPrompt =
      `The following text was supposed to be valid JSON but failed to parse. ` +
      `Return ONLY the corrected, valid JSON with no explanation, ` +
      `no markdown fences, and no extra text:\n\n${raw}`;


    const repaired =
      await callGemini(
        'You are a strict JSON repair tool. Output only valid JSON.',
        repairPrompt
      );


    try {

      return JSON.parse(
        stripCodeFences(repaired)
      );

    } catch (secondErr) {

      throw new GeminiError(
        'Gemini returned malformed JSON twice and could not be repaired.',
        'MALFORMED_JSON'
      );

    }
  }
}


module.exports = {
  callGemini,
  generateJson,
  GeminiError
};
