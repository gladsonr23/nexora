const express=require('express');
const router=express.Router();
const modulesPromise=Promise.resolve([
  require('../study-components/ai.js'),require('../study-components/youtube.js'),
  require('../study-components/pattern.js'),require('../study-components/pattern-ocr.js'),
]);
const {summarizeYouTubeVideo}=require('../study-components/summarizer.js');
router.post('/summarize',async(req,res)=>{
  const sourceUrl=String(req.body?.sourceUrl||'').trim();if(!sourceUrl)return res.status(400).json({error:'Paste a YouTube video link.'});
  try{const [{generateStudyNotes,generateStudyNotesFromYouTube},{fetchYouTubeLecture,parseYouTubeUrl}]=await modulesPromise;
    let parsedUrl;
    try{parsedUrl=parseYouTubeUrl(sourceUrl);}catch(error){return res.status(400).json({error:error.message});}
    const result=await summarizeYouTubeVideo(parsedUrl.sourceUrl,{
      fetchYouTubeLecture,
      generateStudyNotes,
      generateStudyNotesFromYouTube,
      geminiKey:process.env.GEMINI_API_KEY,
      groqKey:process.env.GROQ_API_KEY,
    });
    return res.json(result);
  }catch(error){const captionError=/caption|transcript|YouTube video|lecture title|video is unavailable|video has/i.test(error?.message||'');return res.status(captionError?422:502).json({error:error?.message||'Could not generate notes.'});}
});
router.post('/pattern/analyze',(req,res)=>{
  if(!Array.isArray(req.body?.papers)||req.body.papers.length>30)return res.status(400).json({error:'Choose up to 30 question papers.'});
  modulesPromise.then(([, , pattern])=>res.json(pattern.analyzeQuestionPapers(req.body.papers))).catch(error=>res.status(500).json({error:error?.message||'Could not analyze these papers.'}));
});
router.post('/pattern/extract',express.raw({type:'*/*',limit:'4mb'}),async(req,res)=>{
  const filename=String(req.query.name||'Question paper').slice(0,120),year=String(req.query.year||'').slice(0,20);
  const pdf=filename.toLowerCase().endsWith('.pdf'),textFile=filename.toLowerCase().endsWith('.txt');
  if(!pdf&&!textFile)return res.status(415).json({error:'Upload a PDF or TXT question paper.'});
  const bytes=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
  if(!bytes.length)return res.status(400).json({error:'The selected file is empty.'});
  if(pdf&&bytes.subarray(0,5).toString()!=='%PDF-')return res.status(400).json({error:'This file is not a valid PDF.'});
  try{
    const [, , {inferExamYear,parseQuestionPaper},{extractPdfWithOcr}]=await modulesPromise;
    const examYear=inferExamYear(filename,year);
    const pages=pdf?await extractPdfWithOcr(bytes):[{number:1,text:bytes.toString('utf8'),source:'selectable'}];
    if(!pages.some(page=>String(page.text||'').trim()))return res.status(422).json({error:'The OCR tools found no readable text. Try a clearer scan.'});
    const paper=parseQuestionPaper(pages,{filename,year:examYear}),providers=[...new Set(pages.map(page=>page.source).filter(source=>source==='nvidia'||source==='tesseract'))],scanned=providers.length>0;
    if(!paper.questions.length)return res.status(422).json({error:'Nexora could not identify questions in this paper. Try a clearer scan or another copy.'});
    paper.id=require('node:crypto').randomUUID();paper.addedAt=new Date().toISOString();paper.processing=scanned?`${providers.map(provider=>provider==='nvidia'?'NVIDIA Nemotron OCR':'Local Tesseract').join(' + ')} OCR`:'Selectable PDF text';
    return res.json({paper,processing:{scanned,providers,warnings:pages.flatMap(page=>page.warnings||[]),ocrAgreement:pages.filter(page=>page.source==='ocr').map(page=>page.agreement)}});
  }catch(error){return res.status(502).json({error:error?.message||'Could not extract this paper.'});}
});
module.exports=router;

