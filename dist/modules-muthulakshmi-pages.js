(() => {
  const mountPage = (markup, id) => {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    const page = template.content.firstElementChild;
    if (page) window.NexoraRegisterPage(id, page, () => {});
  };
  if (typeof window.NexoraRegisterPage !== 'function') return;
  mountPage("<section id=\"nx-summarizer\" class=\"nx-summarizer\" aria-labelledby=\"nx-summarizer-title\"><p class=\"nx-eyebrow\">Study workspace / One-Shot Summarizer</p><h1 id=\"nx-summarizer-title\">Turn a YouTube lecture into study notes.</h1><p class=\"nx-module-description\">Paste a video link. Nexora reads its title and captions, then makes clear, timestamped notes you can print or save.</p>\n          <div class=\"nx-summarizer-layout\"><form class=\"nx-caption-form\" id=\"nx-caption-form\"><div class=\"nx-section-head\"><div><p class=\"nx-kicker\">Source</p><h2>YouTube lecture</h2></div><span class=\"nx-step-mark\">01 / Paste link</span></div><label for=\"nx-video-url\">Video link</label><input id=\"nx-video-url\" name=\"sourceUrl\" type=\"url\" inputmode=\"url\" autocomplete=\"url\" placeholder=\"https://www.youtube.com/watch?v=...\" required><p class=\"nx-form-help\">The lecture title and available captions are collected automatically. No upload or transcript paste needed.</p><p class=\"nx-form-error\" id=\"nx-summarizer-error\" role=\"alert\" hidden></p><button class=\"nx-primary-button nx-generate-button\" id=\"nx-generate\" type=\"submit\">Generate study notes →</button><p class=\"nx-source-footnote\">Works with videos that have accessible captions.</p></form>\n            <div class=\"nx-notes-column\" id=\"nx-notes-column\" hidden><div class=\"nx-notes-toolbar\"><div><p class=\"nx-kicker\">Output</p><h2>Your study guide</h2></div><span class=\"nx-step-mark\" id=\"nx-note-status\">Notes ready</span></div><article class=\"nx-study-note\" id=\"nx-study-note\" aria-live=\"polite\"></article><div class=\"nx-notes-actions\" id=\"nx-notes-actions\"><button class=\"nx-secondary-button\" id=\"nx-print-note\" type=\"button\">Preview PDF</button><button class=\"nx-secondary-button\" id=\"nx-download-note\" type=\"button\">Download PDF</button><button class=\"nx-primary-button\" id=\"nx-save-note\" type=\"button\">Save to Vault</button></div></div></div>\n          <div class=\"nx-language-warning\" id=\"nx-language-warning\" role=\"status\" hidden><span aria-hidden=\"true\">!</span><p>The given URL is in Non English language</p><button type=\"button\" id=\"nx-dismiss-language-warning\" aria-label=\"Dismiss language warning\">×</button></div>\n        </section>", 'summarizer');
  mountPage("<section id=\"nx-pattern\" class=\"nx-pattern\" aria-labelledby=\"nx-pattern-title\"><p class=\"nx-eyebrow\">Focus & insights / Prof Pattern Detector</p><h1 id=\"nx-pattern-title\">See what your papers keep asking.</h1><p class=\"nx-module-description\">Upload past question papers to spot repeated questions and marks weightage. These are historical counts, not predictions of the next exam.</p>\n          <div class=\"nx-pattern-intro\"><form id=\"nx-pattern-form\" class=\"nx-pattern-form\"><div class=\"nx-section-head\"><div><p class=\"nx-kicker\">Question bank</p><h2>Add papers</h2></div><span class=\"nx-step-mark\">01 / Choose source</span></div><div class=\"nx-pattern-source-actions\"><label class=\"nx-secondary-button nx-pattern-upload-label\" for=\"nx-pattern-file\">↑ Upload files</label><button class=\"nx-secondary-button\" id=\"nx-pattern-vault-open\" type=\"button\">▣ Get from Vault</button></div><input class=\"nx-pattern-file-input\" id=\"nx-pattern-file\" type=\"file\" accept=\".pdf,.txt,application/pdf,text/plain\" multiple><div class=\"nx-pattern-selected-files\" id=\"nx-pattern-selected-files\" hidden></div><div class=\"nx-pattern-vault-picker\" id=\"nx-pattern-vault-picker\" hidden><p class=\"nx-kicker\">Files in Vault</p><div id=\"nx-pattern-vault-files\"></div><button class=\"nx-primary-button\" id=\"nx-pattern-vault-add\" type=\"button\">Add selected from Vault →</button></div><label for=\"nx-pattern-year\">Fallback exam year <span class=\"nx-optional\">optional</span></label><input id=\"nx-pattern-year\" type=\"text\" maxlength=\"20\" placeholder=\"Used only when a filename has no year\"><p class=\"nx-form-help\">Select files together or add them in several batches. Years such as 2026 and 2025 are read from each filename automatically. Scanned pages are OCR-processed by Nexora's API server using local Tesseract. Paper content is not sent to AI providers in this release; add topic labels manually.</p><p class=\"nx-pattern-progress\" id=\"nx-pattern-progress\" role=\"status\" hidden></p><p class=\"nx-form-error\" id=\"nx-pattern-error\" role=\"alert\" hidden></p><button class=\"nx-primary-button\" id=\"nx-pattern-add\" type=\"submit\">Analyze selected files →</button></form><div class=\"nx-pattern-sources\"><p class=\"nx-kicker\">This session</p><h2>Included papers</h2><div id=\"nx-pattern-papers\"></div></div></div>\n          <div id=\"nx-pattern-results\" class=\"nx-pattern-results\" hidden><div class=\"nx-pattern-results-head\"><div><p class=\"nx-kicker\">Historical pattern</p><h2>Question-bank analysis</h2></div><p>Historical evidence supports revision priorities; it cannot predict the next exam.</p></div><div class=\"nx-pattern-stats\" id=\"nx-pattern-stats\"></div><div class=\"nx-pattern-charts\"><section class=\"nx-pattern-card\" aria-labelledby=\"nx-pattern-repeat-title\"><h3 id=\"nx-pattern-repeat-title\">Most repeated questions</h3><p>Number of distinct papers containing the question</p><div id=\"nx-pattern-repeat-chart\"></div></section><section class=\"nx-pattern-card\" aria-labelledby=\"nx-pattern-topic-title\"><h3 id=\"nx-pattern-topic-title\">Topics by marks</h3><p>Based on extracted marks only. Edit topic names in the question list.</p><div id=\"nx-pattern-topic-chart\"></div></section><section class=\"nx-pattern-card\" aria-labelledby=\"nx-pattern-trend-title\"><h3 id=\"nx-pattern-trend-title\">Repeated questions over time</h3><p>Share of questions in each year that match another paper.</p><div id=\"nx-pattern-trend-chart\"></div></section><section class=\"nx-pattern-card\" aria-labelledby=\"nx-pattern-share-title\"><h3 id=\"nx-pattern-share-title\">Topic share</h3><p>Share of all detected question occurrences. Top topics shown.</p><div id=\"nx-pattern-share-chart\"></div></section></div><section class=\"nx-pattern-question-section\" aria-labelledby=\"nx-pattern-questions-title\"><div class=\"nx-pattern-results-head\"><div><p class=\"nx-kicker\">Question detail</p><h2 id=\"nx-pattern-questions-title\">All question groups</h2></div><label class=\"nx-pattern-filter\" for=\"nx-pattern-sort\">Explore <select id=\"nx-pattern-sort\"><option value=\"frequency\">Most repeated</option><option value=\"least-frequency\">Least repeated</option><option value=\"marks\">Highest marks</option><option value=\"least-marks\">Lowest marks</option><option value=\"important\">Most important topics</option><option value=\"least-important\">Least important topics</option></select></label></div><div class=\"nx-pattern-ai-row\"><button class=\"nx-secondary-button\" id=\"nx-pattern-ai\" type=\"button\" disabled>AI topic labeling is off</button><p id=\"nx-pattern-ai-status\" role=\"status\">Question papers are processed by Nexora only. Topic labels stay manual and are not sent to AI providers.</p></div><div id=\"nx-pattern-questions\"></div></section></div>\n        </section>", 'pattern');

  const $ = selector => document.querySelector(selector);
  const form = $('#nx-caption-form');
  const noteHost = $('#nx-study-note');
  let currentNote = null;
  const apiBase = (window.NEXORA_API_BASE ?? 'http://localhost:4000').replace(/\/$/, '');
  function text(parent, tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = String(value ?? '');
    parent.append(el);
    return el;
  }
  function renderNote(note) {
    noteHost.replaceChildren();
    text(noteHost,'p','nx-note-label','Nexora study guide');
    text(noteHost,'h2','',note.title);
    text(noteHost,'p','nx-note-overview',note.overview);
    text(noteHost,'p','nx-note-source',[note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-IN') : '',note.provider || ''].filter(Boolean).join(' · '));
    (Array.isArray(note.sections) ? note.sections : []).forEach((section,index) => {
      const block=document.createElement('section'); block.className='nx-note-section';
      const heading=text(block,'h3','',`${String(index+1).padStart(2,'0')}  ${section.heading || 'Topic'}`);
      const timestamp=String(section.timestamp || '').trim();
      if(timestamp){
        const link=document.createElement('a');link.className='nx-note-timestamp';link.textContent=timestamp;link.href='#';
        link.addEventListener('click',event=>{event.preventDefault();try{const url=new URL(note.sourceUrl);const parts=timestamp.split(':').map(Number);const seconds=parts.length>1?parts[parts.length-1]+parts[parts.length-2]*60:parts[0];url.searchParams.set('t',`${Math.max(0,seconds)}s`);window.open(url.href,'_blank','noopener,noreferrer');}catch(_){}});
        block.insertBefore(link,heading);
      }
      const list=document.createElement('ul');(Array.isArray(section.points)?section.points:[]).forEach(item=>text(list,'li','',item));block.append(list);noteHost.append(block);
    });
    const recap=document.createElement('section');recap.className='nx-note-section nx-note-recap';text(recap,'h3','','Key takeaways');
    const list=document.createElement('ul');(Array.isArray(note.takeaways)?note.takeaways:[]).forEach(item=>text(list,'li','',item));recap.append(list);noteHost.append(recap);
    const notesColumn=$('#nx-notes-column');notesColumn.parentElement.insertBefore(notesColumn,form);
    $('#nx-summarizer').classList.add('nx-has-notes');notesColumn.hidden=false;$('#nx-note-status').textContent='Notes ready';
  }
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const error=$('#nx-summarizer-error'),button=$('#nx-generate'),sourceUrl=$('#nx-video-url').value.trim();
    error.hidden=true;button.disabled=true;button.textContent='Generating study notes…';$('#nx-note-status').textContent='Getting captions and preparing your notes…';
    try{
      const response=await fetch(`${apiBase}/api/summarize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceUrl})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not generate notes.');
      if(!result.notes||!Array.isArray(result.notes.sections))throw new Error('The summarizer returned an unexpected response.');
      currentNote=result.notes;renderNote(currentNote);$('#nx-language-warning').hidden=!result.languageWarning;
      if(typeof toast==='function')toast('Study notes are ready. Review them before saving.');
    }catch(problem){error.textContent=problem.message==='Failed to fetch'?'Could not reach the Nexora API. Try again in a moment.':problem.message;error.hidden=false;$('#nx-note-status').textContent='Generation failed';}
    finally{button.disabled=false;button.textContent='Generate study notes →';}
  });
  $('#nx-dismiss-language-warning')?.addEventListener('click',()=>$('#nx-language-warning').hidden=true);
  function makePdf(){if(!currentNote||!window.NexoraPdf||!window.jspdf?.jsPDF)throw new Error('PDF export is not available. Reload Nexora and try again.');return window.NexoraPdf.createStudyGuidePdf(currentNote);}
  $('#nx-download-note')?.addEventListener('click',()=>{try{makePdf().save(window.NexoraPdf.filename(currentNote));}catch(error){if(typeof toast==='function')toast(error.message);}});
  const previewDialog=document.createElement('dialog');previewDialog.className='nx-pdf-preview';previewDialog.setAttribute('aria-label','Study guide PDF preview');
  previewDialog.innerHTML='<div class="nx-pdf-preview-shell"><header class="nx-pdf-preview-toolbar"><strong class="nx-pdf-preview-title"></strong><button type="button" data-pdf-close>Back to notes</button></header><div id="nx-pdf-react-root"></div></div>';
  document.body.append(previewDialog);
  let unmountPdfViewer=null;
  $('#nx-print-note')?.addEventListener('click',async()=>{
    try{
      previewDialog.querySelector('.nx-pdf-preview-title').textContent=window.NexoraPdf.filename(currentNote);
      previewDialog.showModal();
      const viewer=await import('./pdf-viewer-react.js?v=2');
      if(!previewDialog.open)return;
      const data=new Uint8Array(makePdf().output('arraybuffer'));
      unmountPdfViewer=viewer.mountPdfViewer(previewDialog.querySelector('#nx-pdf-react-root'),{data,fileName:window.NexoraPdf.filename(currentNote)});
    }catch(error){if(previewDialog.open)previewDialog.close();if(typeof toast==='function')toast(error.message||'Could not open the PDF preview.');}
  });
  previewDialog.querySelector('[data-pdf-close]').addEventListener('click',()=>previewDialog.close());
  document.addEventListener('pointerdown',event=>{
    if(!previewDialog.open)return;
    const bounds=previewDialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)previewDialog.close();
  },true);
  previewDialog.addEventListener('close',()=>{unmountPdfViewer?.();unmountPdfViewer=null;});
  $('#nx-save-note')?.addEventListener('click',async()=>{try{if(!currentNote||!window.NexoraVaultFileStore)throw new Error('Browser Vault is unavailable.');const file=new File([makePdf().output('blob')],window.NexoraPdf.filename(currentNote),{type:'application/pdf'});await window.NexoraVaultFileStore.putMany([file],{category:'Notes'});if(typeof toast==='function')toast('Study guide saved to this browser’s Vault.');}catch(error){if(typeof toast==='function')toast(error.message);}});
})();
