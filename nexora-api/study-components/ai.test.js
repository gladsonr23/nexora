const test=require('node:test');
const assert=require('node:assert/strict');
const {generateStudyNotesFromYouTube}=require('./ai');

const note={
  title:'Operating Systems',
  overview:'A lecture comparing common operating systems.',
  sections:[{timestamp:'00:10',heading:'Windows',points:['Windows runs on many PC brands.']}],
  takeaways:['Operating systems manage computer resources.'],
  sourceLanguageCode:'en',
};

test('sends a public YouTube URL directly to Gemini when transcript access is blocked',async()=>{
  let requestedUrl,request;
  const result=await generateStudyNotesFromYouTube('https://www.youtube.com/watch?v=kK7L2ISGucM',{
    geminiKey:'test-gemini-key',
    fetchImpl:async(url,options)=>{
      requestedUrl=url;
      request=JSON.parse(options.body);
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(note)}]}}]}),{status:200});
    },
  });

  assert.match(requestedUrl,/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(request.contents[0].parts[0].fileData.fileUri,'https://www.youtube.com/watch?v=kK7L2ISGucM');
  assert.match(request.contents[0].parts[1].text,/study notes/i);
  assert.equal(request.generationConfig.responseSchema.properties.sourceLanguageCode.type,'string');
  assert.equal(result.notes.title,note.title);
  assert.equal(result.languageCode,'en');
  assert.equal('sourceLanguageCode' in result.notes,false);
});

test('requires a Gemini key for direct video notes',async()=>{
  await assert.rejects(generateStudyNotesFromYouTube('https://youtu.be/kK7L2ISGucM',{}),/Gemini API key/i);
});

