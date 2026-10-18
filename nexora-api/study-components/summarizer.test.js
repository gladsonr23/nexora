const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizeYouTubeVideo}=require('./summarizer');

const notes={title:'Every Operating System Explained',overview:'A clear overview.',sections:[{timestamp:'00:20',heading:'Windows',points:['Windows supports a wide range of devices.']}],takeaways:['Operating systems manage hardware and software.']};

test('falls back to Gemini video input when YouTube returns the transcript-missing error',async()=>{
  let videoUrl,videoOptions,textGenerationCalled=false;
  const result=await summarizeYouTubeVideo('https://www.youtube.com/watch?v=kK7L2ISGucM',{
    fetchYouTubeLecture:async()=>{throw new Error('YouTube did not return transcript data to Nexora. Captions may still be visible in the player; try again shortly.');},
    generateStudyNotes:async()=>{textGenerationCalled=true;},
    generateStudyNotesFromYouTube:async(url,options)=>{videoUrl=url;videoOptions=options;return {notes,provider:'Gemini',model:'gemini-3.5-flash-lite',languageCode:'en'};},
    geminiKey:'server-key',
    now:()=> '2026-10-18T00:00:00.000Z',
  });

  assert.equal(videoUrl,'https://www.youtube.com/watch?v=kK7L2ISGucM');
  assert.deepEqual(videoOptions,{geminiKey:'server-key'});
  assert.equal(textGenerationCalled,false);
  assert.equal(result.notes.title,notes.title);
  assert.equal(result.notes.sourceUrl,videoUrl);
  assert.equal(result.notes.provider,'Gemini');
  assert.equal(result.notes.model,'gemini-3.5-flash-lite');
  assert.equal(result.notes.createdAt,'2026-10-18T00:00:00.000Z');
  assert.equal(result.languageWarning,false);
});

test('keeps the existing caption-to-notes path when transcript retrieval works',async()=>{
  let prompt,videoFallbackCalled=false;
  const result=await summarizeYouTubeVideo('https://www.youtube.com/watch?v=kK7L2ISGucM',{
    fetchYouTubeLecture:async()=>({title:'Lecture',sourceUrl:'https://www.youtube.com/watch?v=kK7L2ISGucM',languageCode:'en',languageWarning:false,captions:'[00:10] Study material '.repeat(25)}),
    generateStudyNotes:async(value)=>{prompt=value;return {notes,provider:'Gemini',model:'gemini-3.8-flash'};},
    generateStudyNotesFromYouTube:async()=>{videoFallbackCalled=true;},
    now:()=> '2026-10-18T00:00:00.000Z',
  });

  assert.match(prompt,/Timestamped captions/);
  assert.equal(videoFallbackCalled,false);
  assert.equal(result.notes.title,'Lecture');
  assert.equal(result.notes.provider,'Gemini');
});

test('does not send private or unavailable videos to Gemini fallback',async()=>{
  let videoFallbackCalled=false;
  await assert.rejects(summarizeYouTubeVideo('https://www.youtube.com/watch?v=kK7L2ISGucM',{
    fetchYouTubeLecture:async()=>{throw new Error('This YouTube video is unavailable or private.');},
    generateStudyNotesFromYouTube:async()=>{videoFallbackCalled=true;return {notes};},
  }),/unavailable or private/i);
  assert.equal(videoFallbackCalled,false);
});

