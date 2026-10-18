const test = require('node:test');
const assert = require('node:assert/strict');
const {createPlayerFetch, fetchYouTubeLecture} = require('./youtube');

test('retries the Innertube player with the iOS client when Android omits captions', async () => {
  const requests = [];
  const playerFetch = createPlayerFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push(body.context.client.clientName);
    return new Response(JSON.stringify(body.context.client.clientName === 'ANDROID'
      ? {playabilityStatus: {status: 'LOGIN_REQUIRED'}}
      : {playabilityStatus: {status: 'OK'}, captions: {playerCaptionsTracklistRenderer: {captionTracks: [{languageCode: 'en'}]}}}), {status: 200});
  });

  const response = await playerFetch({url: 'https://www.youtube.com/youtubei/v1/player?key=test', method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({context: {client: {clientName: 'ANDROID', clientVersion: '20.10.38'}}, videoId: 'kK7L2ISGucM'})});

  assert.deepEqual(requests, ['ANDROID', 'IOS']);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).captions.playerCaptionsTracklistRenderer.captionTracks[0].languageCode, 'en');
});

test('keeps the Android response when both player clients omit captions', async () => {
  const requests = [];
  const playerFetch = createPlayerFetch(async (_url, init) => {
    requests.push(JSON.parse(init.body).context.client.clientName);
    return new Response(JSON.stringify({playabilityStatus: {status: 'LOGIN_REQUIRED'}}), {status: 200});
  });

  const response = await playerFetch({url: 'https://www.youtube.com/youtubei/v1/player?key=test', method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({context: {client: {clientName: 'ANDROID', clientVersion: '20.10.38'}}, videoId: 'kK7L2ISGucM'})});

  assert.deepEqual(requests, ['ANDROID', 'IOS']);
  assert.equal((await response.json()).playabilityStatus.status, 'LOGIN_REQUIRED');
});

test('fetches captions directly when YouTube returns no language list', async () => {
  const transcript = Array.from({length: 40}, (_, index) => ({
    text: `Caption segment ${index} explains how operating systems manage memory and processes.`,
    offset: index * 5,
    lang: 'en',
  }));
  let transcriptOptions;
  const lecture = await fetchYouTubeLecture('https://youtu.be/kK7L2ISGucM', {
    transcriptApi: {
      YoutubeTranscriptDisabledError: class YoutubeTranscriptDisabledError extends Error {},
      YoutubeTranscriptNotAvailableError: class YoutubeTranscriptNotAvailableError extends Error {},
      YoutubeTranscriptNotAvailableLanguageError: class YoutubeTranscriptNotAvailableLanguageError extends Error {},
      YoutubeTranscriptVideoUnavailableError: class YoutubeTranscriptVideoUnavailableError extends Error {},
      listLanguages: async () => [],
      fetchTranscript: async (_videoId, options) => {
        transcriptOptions = options;
        return {segments: transcript, videoDetails: {title: 'Every Operating System Explained'}};
      },
    },
  });

  assert.equal(lecture.title, 'Every Operating System Explained');
  assert.equal(lecture.languageCode, 'en');
  assert.deepEqual(transcriptOptions, {videoDetails: true, retries: 2});
});

test('continues to direct transcript retrieval when language discovery is unavailable', async () => {
  const transcript = Array.from({length: 40}, (_, index) => ({
    text: `Caption segment ${index} explains how operating systems manage memory and processes.`,
    offset: index * 5,
    lang: 'en',
  }));
  let transcriptOptions;
  const api = {
    YoutubeTranscriptDisabledError: class YoutubeTranscriptDisabledError extends Error {},
    YoutubeTranscriptNotAvailableError: class YoutubeTranscriptNotAvailableError extends Error {},
    YoutubeTranscriptNotAvailableLanguageError: class YoutubeTranscriptNotAvailableLanguageError extends Error {},
    YoutubeTranscriptVideoUnavailableError: class YoutubeTranscriptVideoUnavailableError extends Error {},
    listLanguages: async () => { throw new api.YoutubeTranscriptNotAvailableError('Temporary player response omitted captions'); },
    fetchTranscript: async (_videoId, options) => {
      transcriptOptions = options;
      return {segments: transcript, videoDetails: {title: 'Every Operating System Explained'}};
    },
  };

  const lecture = await fetchYouTubeLecture('https://youtu.be/kK7L2ISGucM', {transcriptApi: api});

  assert.equal(lecture.title, 'Every Operating System Explained');
  assert.deepEqual(transcriptOptions, {videoDetails:true, retries:2});
});

test('retries a listed caption track without forcing its language', async () => {
  const transcript = Array.from({length: 40}, (_, index) => ({
    text: `Caption segment ${index} explains how operating systems manage memory and processes.`,
    offset: index * 5,
    lang: 'en',
  }));
  const calls = [];
  const api = {
    YoutubeTranscriptDisabledError: class YoutubeTranscriptDisabledError extends Error {},
    YoutubeTranscriptNotAvailableError: class YoutubeTranscriptNotAvailableError extends Error {},
    YoutubeTranscriptNotAvailableLanguageError: class YoutubeTranscriptNotAvailableLanguageError extends Error {},
    YoutubeTranscriptVideoUnavailableError: class YoutubeTranscriptVideoUnavailableError extends Error {},
    listLanguages: async () => [{languageCode: 'en', languageName: 'English', isAutoGenerated: true}],
    fetchTranscript: async (_videoId, options) => {
      calls.push(options);
      if (options.lang) throw new api.YoutubeTranscriptNotAvailableLanguageError('English track lookup failed');
      return {segments: transcript, videoDetails: {title: 'Every Operating System Explained'}};
    },
  };

  const lecture = await fetchYouTubeLecture('https://youtu.be/kK7L2ISGucM', {transcriptApi: api});

  assert.equal(lecture.title, 'Every Operating System Explained');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].lang, 'en');
  assert.deepEqual(calls[1], {videoDetails: true, retries: 2});
});

