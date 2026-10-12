(() => {
  const $ = selector => document.querySelector(selector);
  const node = (tag, className = '', value = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };
  const form = $('#nx-pattern-form');
  const fileInput = $('#nx-pattern-file');
  const yearInput = $('#nx-pattern-year');
  const error = $('#nx-pattern-error');
  const addButton = $('#nx-pattern-add');
  const papersList = $('#nx-pattern-papers');
  const results = $('#nx-pattern-results');
  const sort = $('#nx-pattern-sort');
  const progress = $('#nx-pattern-progress');
  const vaultOpen = $('#nx-pattern-vault-open');
  const vaultPicker = $('#nx-pattern-vault-picker');
  const vaultFiles = $('#nx-pattern-vault-files');
  const vaultAdd = $('#nx-pattern-vault-add');
  let aiTopics = new Map();
  let papers = [];
  let pendingFiles = [];
  let legacyPapers = [];
  let topicOverrides = {};
  let analysis = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('nexora-pattern-papers') || '[]');
    if (Array.isArray(saved)) papers = saved.filter(paper => paper && Array.isArray(paper.questions)).slice(0, 30);
    const legacy = JSON.parse(localStorage.getItem('nexora-pattern-papers') || '[]');
    if (Array.isArray(legacy)) legacyPapers = legacy.filter(paper => paper && Array.isArray(paper.questions));
    const savedTopics = JSON.parse(localStorage.getItem('nexora-pattern-topics') || '{}');
    if (savedTopics && typeof savedTopics === 'object' && !Array.isArray(savedTopics)) topicOverrides = savedTopics;
  } catch (_) {}

  const setError = message => { error.textContent = message; error.hidden = !message; };
  const topicKey = question => question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const topicOf = group => topicOverrides[topicKey(group.question)] || aiTopics.get(group.id)?.topic || group.topic;
  const persist = () => {
    try { sessionStorage.setItem('nexora-pattern-papers', JSON.stringify(papers)); return true; }
    catch (_) { return false; }
  };
  const persistTopics = () => {
    try { localStorage.setItem('nexora-pattern-topics', JSON.stringify(topicOverrides)); } catch (_) {}
  };
  const readStore = (key, fallback = []) => {
    try { const value=JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); return Array.isArray(value) ? value : fallback; } catch (_) { return fallback; }
  };
  const writeStore = (key,value) => { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch (_) { return false; } };
  function savePapersToVault(added) {
    const stored=readStore('nexora-vault-papers');
    const sessionId=window.NexoraSession?.id || null;
    const tagged=added.map(paper=>({...paper,sessionId:paper.sessionId === undefined ? sessionId : paper.sessionId}));
    const merged=[...tagged,...stored.filter(item => !tagged.some(paper => paper.id===item.id))].slice(0,60);
    writeStore('nexora-vault-papers',merged);
    window.dispatchEvent(new Event('nexora:vault-updated'));
  }
  if (legacyPapers.length) {
    savePapersToVault(legacyPapers.map(paper=>({...paper,sessionId:null})));
    try { localStorage.removeItem('nexora-pattern-papers'); } catch (_) {}
  }
  const sortPapersByYear = values => values.sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0) || String(a.filename).localeCompare(String(b.filename)));
  const reportActions=node('div','nx-pattern-report-actions');
  const saveReportButton=node('button','nx-primary-button','Save report to Vault'); saveReportButton.type='button';
  const printReportButton=node('button','nx-secondary-button','Open / Print PDF'); printReportButton.type='button';
  const downloadReportButton=node('button','nx-secondary-button','Download PDF'); downloadReportButton.type='button';
  reportActions.append(saveReportButton,printReportButton,downloadReportButton);
  results.querySelector('.nx-pattern-results-head').after(reportActions);

  function reportSnapshot() {
    if (!analysis) return null;
    const topicMap=new Map();
    analysis.groups.forEach(group => {
      const label=topicOf(group); const item=topicMap.get(label) || {topic:label,count:0,marks:0};
      item.count+=group.count; item.marks+=group.totalMarks; topicMap.set(label,item);
    });
    const years=[...new Set(papers.map(paper=>paper.year).filter(year=>/^\d{4}$/.test(year)))].sort();
    const trend=years.map(year => { const entries=analysis.groups.flatMap(group=>group.occurrences.filter(item=>item.year===year).map(()=>group)); return {year,value:entries.length?Math.round(100*entries.filter(group=>group.paperCount>1).length/entries.length):0}; });
    return {id:crypto.randomUUID(),title:'Prof Pattern Analysis',createdAt:new Date().toISOString(),sessionId:window.NexoraSession?.id || null,papers:structuredClone(papers),analysis:structuredClone(analysis),topics:[...topicMap.values()].sort((a,b)=>b.marks-a.marks||b.count-a.count),trend,aiTopics:[...aiTopics.entries()]};
  }
  function patternPdf(report) { return window.NexoraPdf.createPatternReportPdf(report,window.jspdf?.jsPDF); }
  function openPatternPdf(report) {
    const viewer=window.open('','_blank');
    if (!viewer) return setError('Allow pop-ups to open the printable PDF, or use Download PDF.');
    try { const url=URL.createObjectURL(patternPdf(report).output('blob')); viewer.location.href=url; }
    catch (problem) { viewer.close(); setError(problem.message || 'Could not open the PDF report.'); }
  }
  function downloadPatternPdf(report) { try { patternPdf(report).save(window.NexoraPdf.patternFilename(report)); } catch (problem) { setError(problem.message || 'Could not download the PDF report.'); } }

  function renderPapers() {
    papersList.replaceChildren();
    if (!papers.length) {
      papersList.append(node('p', 'nx-pattern-empty', 'No papers yet. Add your first question paper to begin.'));
      return;
    }
    sortPapersByYear(papers);
    let renderedYear='';
    papers.forEach((paper, index) => {
      const year=paper.year || 'No year';
      if (year !== renderedYear) { papersList.append(node('h3','nx-pattern-year-heading',year)); renderedYear=year; }
      const row = node('div', 'nx-pattern-paper');
      const info = node('div');
      info.append(node('strong', '', paper.filename), node('small', '', `${paper.year || 'No year'} · ${paper.questions.length} questions · ${paper.pageCount || 1} ${paper.pageCount === 1 ? 'page' : 'pages'}`));
      const remove = node('button', 'nx-pattern-remove', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${paper.filename}`);
      remove.addEventListener('click', async () => {
        papers.splice(index, 1);
        persist();
        renderPapers();
        await analyze();
      });
      row.append(info, remove);
      papersList.append(row);
    });
  }

  function renderPendingFiles() {
    const target=$('#nx-pattern-selected-files');
    target.replaceChildren();
    target.hidden=!pendingFiles.length;
    pendingFiles.forEach((file,index)=>{
      const row=node('div','nx-pattern-selected-file');
      row.append(node('span','',file.name));
      const remove=node('button','','Remove'); remove.type='button'; remove.setAttribute('aria-label',`Remove ${file.name}`);
      remove.addEventListener('click',()=>{pendingFiles.splice(index,1);renderPendingFiles();});
      row.append(remove);target.append(row);
    });
    addButton.firstChild.textContent=pendingFiles.length ? `Analyze ${pendingFiles.length} selected file${pendingFiles.length===1?'':'s'} ` : 'Analyze selected files ';
  }
  fileInput.addEventListener('change',()=>{
    const selected=[...(fileInput.files || [])];
    selected.forEach(file=>{if(!pendingFiles.some(item=>item.name===file.name && item.size===file.size && item.lastModified===file.lastModified)) pendingFiles.push(file);});
    fileInput.value=''; renderPendingFiles(); setError('');
  });

  const metric = (label, value, note) => {
    const card = node('div');
    card.append(node('span', '', label), node('strong', '', String(value)), node('small', '', note));
    return card;
  };
  function bars(target, entries, max, unit) {
    target.replaceChildren();
    if (!entries.length || max <= 0) {
      target.append(node('p', 'nx-pattern-empty', unit === 'marks' ? 'No marks were found in these papers. Add marks like [8] after each question.' : 'Add at least one paper with numbered questions.'));
      return;
    }
    entries.forEach((entry, index) => {
      const item = node('div', 'nx-pattern-bar-item');
      const top = node('div', 'nx-pattern-bar-top');
      top.append(node('span', '', entry.label), node('strong', '', `${entry.value} ${unit}`));
      const track = node('div', 'nx-pattern-bar-track');
      const fill = node('div', `nx-pattern-bar-fill${index === 0 ? ' nx-pattern-bar-lead' : ''}`);
      fill.style.width = `${Math.max(4, 100 * entry.value / max)}%`;
      track.append(fill);
      item.append(top, track);
      target.append(item);
    });
  }

  function renderQuestions() {
    const target = $('#nx-pattern-questions');
    target.replaceChildren();
    const groups = [...analysis.groups];
    const priority = group => group.paperCount * 3 + group.totalMarks + group.count + (aiTopics.get(group.id)?.aiImportance || 0) * 2;
    if (sort.value === 'marks') groups.sort((a, b) => b.totalMarks - a.totalMarks || b.paperCount - a.paperCount);
    if (sort.value === 'least-marks') groups.sort((a, b) => a.totalMarks - b.totalMarks || a.paperCount - b.paperCount);
    if (sort.value === 'least-frequency') groups.sort((a, b) => a.paperCount - b.paperCount || a.count - b.count);
    if (sort.value === 'important') groups.sort((a,b) => priority(b)-priority(a));
    if (sort.value === 'least-important') groups.sort((a,b) => priority(a)-priority(b));
    if (!groups.length) { target.append(node('p', 'nx-pattern-empty', 'No questions were detected.')); return; }
    groups.forEach((group, index) => {
      const card = node('article', 'nx-pattern-question');
      const heading = node('div', 'nx-pattern-question-head');
      heading.append(node('span', 'nx-pattern-rank', String(index + 1).padStart(2, '0')), node('h3', '', group.question));
      const badges = node('div', 'nx-pattern-badges');
      badges.append(node('span', '', `${group.paperCount}/${analysis.paperCount} papers`), node('span', '', `${group.count} occurrence${group.count === 1 ? '' : 's'}`), node('span', '', group.marksKnown ? `${group.totalMarks} total marks` : 'Marks not found'));
      if (sort.value.includes('important')) badges.append(node('span', '', `Study priority ${priority(group)} · historical evidence${aiTopics.get(group.id)?.aiImportance ? ` + AI ${aiTopics.get(group.id).aiImportance}/5` : ''}`));
      if (aiTopics.get(group.id)?.alternate) badges.append(node('span', '', `Groq suggested: ${aiTopics.get(group.id).alternate}`));
      if (aiTopics.get(group.id)?.importanceDisagreement >= 2) badges.append(node('span', '', 'AI priority ratings differ — review manually'));
      const sources = node('p', 'nx-pattern-sources-line', group.occurrences.map(item => `${item.year || item.paper}${item.page ? ` · p.${item.page}` : ''}${item.marks ? ` · ${item.marks} marks` : ''}`).join('   •   '));
      const topicLabel = node('label', 'nx-pattern-topic-edit', 'Topic');
      const topicInput = node('input');
      topicInput.type = 'text';
      topicInput.maxLength = 50;
      topicInput.value = topicOf(group);
      topicInput.setAttribute('aria-label', `Topic for ${group.question}`);
      topicInput.addEventListener('change', () => {
        const value = topicInput.value.replace(/\s+/g, ' ').trim().slice(0, 50);
        if (value) topicOverrides[topicKey(group.question)] = value;
        else delete topicOverrides[topicKey(group.question)];
        topicInput.value = topicOf(group);
        persistTopics();
        renderCharts();
        renderQuestions();
      });
      topicLabel.append(topicInput);
      card.append(heading, badges, sources, topicLabel);
      if (sort.value.includes('important') && aiTopics.get(group.id)?.reasons?.length) card.append(node('p','nx-pattern-sources-line',`AI study rationale: ${aiTopics.get(group.id).reasons[0]}`));
      target.append(card);
    });
  }

  function renderCharts() {
    const repeated = analysis.groups.filter(group => group.paperCount > 1).slice(0, 5).map(group => ({label:group.question, value:group.paperCount}));
    bars($('#nx-pattern-repeat-chart'), repeated, analysis.paperCount, 'papers');
    if (!repeated.length) $('#nx-pattern-repeat-chart').firstChild.textContent = 'No cross-paper repeats yet. Add another paper to compare question wording.';
    const topics = new Map();
    analysis.groups.forEach(group => {
      const key = topicOf(group);
      topics.set(key, (topics.get(key) || 0) + group.totalMarks);
    });
    const ranked = [...topics].filter(([,value]) => value > 0).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([label,value]) => ({label,value}));
    bars($('#nx-pattern-topic-chart'), ranked, ranked[0]?.value || 0, 'marks');
    renderTrend();
    renderShare();
  }

  function svgEl(tag, attrs = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value]) => element.setAttribute(key,String(value)));
    return element;
  }
  function renderTrend() {
    const target = $('#nx-pattern-trend-chart');
    target.replaceChildren();
    const years = [...new Set(papers.map(paper => paper.year).filter(year => /^\d{4}$/.test(year)))].sort();
    if (years.length < 2) return target.append(node('p','nx-pattern-empty','Add papers from at least two distinct years to see a time trend.'));
    const series = years.map(year => {
      const entries = analysis.groups.flatMap(group => group.occurrences.filter(item => item.year === year).map(() => group));
      return {year,value:entries.length ? Math.round(100*entries.filter(group => group.paperCount > 1).length/entries.length) : 0};
    });
    const svg = svgEl('svg',{viewBox:'0 0 600 210',role:'img','aria-label':`Repeated question share by year: ${series.map(item => `${item.year} ${item.value}%`).join(', ')}`});
    for (const level of [0,25,50,75,100]) {
      const y = 170-level*1.4;
      svg.append(svgEl('line',{x1:45,y1:y,x2:580,y2:y,class:'nx-chart-grid'}));
      const label = svgEl('text',{x:4,y:y+4,class:'nx-chart-label'}); label.textContent = `${level}%`; svg.append(label);
    }
    const points = series.map((item,index) => ({x:55+index*515/(series.length-1),y:170-item.value*1.4,...item}));
    svg.append(svgEl('polygon',{points:`55,170 ${points.map(point => `${point.x},${point.y}`).join(' ')} ${points.at(-1).x},170`,class:'nx-chart-area'}));
    svg.append(svgEl('polyline',{points:points.map(point => `${point.x},${point.y}`).join(' '),class:'nx-chart-line'}));
    points.forEach(point => {
      const circle = svgEl('circle',{cx:point.x,cy:point.y,r:6,tabindex:0,class:'nx-chart-point','aria-label':`${point.year}: ${point.value}% repeated`});
      const title = svgEl('title'); title.textContent = `${point.year}: ${point.value}% repeated`; circle.append(title); svg.append(circle);
      const label = svgEl('text',{x:point.x,y:195,'text-anchor':'middle',class:'nx-chart-label'}); label.textContent=point.year; svg.append(label);
    });
    target.append(svg);
  }
  function renderShare() {
    const target = $('#nx-pattern-share-chart'); target.replaceChildren();
    const topics = new Map();
    analysis.groups.forEach(group => topics.set(topicOf(group),(topics.get(topicOf(group)) || 0)+group.count));
    const ranked = [...topics].sort((a,b) => b[1]-a[1]);
    if (!ranked.length) return;
    const slices = ranked.slice(0,4);
    const other = ranked.slice(4).reduce((sum,item) => sum+item[1],0);
    if (other) slices.push(['Other topics',other]);
    const total = slices.reduce((sum,item) => sum+item[1],0);
    const palette = ['var(--nx-accent)','var(--nx-secondary)','var(--nx-chart-3)','var(--nx-chart-4)','var(--nx-chart-5)'];
    const wrap = node('div','nx-pattern-share');
    const svg = svgEl('svg',{viewBox:'0 0 220 220',role:'img','aria-label':`Topic share: ${slices.map(([label,count]) => `${label} ${count} of ${total}`).join(', ')}`});
    let progress = 0;
    slices.forEach(([label,count],index) => {
      const circle = svgEl('circle',{cx:110,cy:110,r:76,fill:'none',stroke:palette[index],'stroke-width':28,'stroke-dasharray':`${count/total*477.5} 477.5`,'stroke-dashoffset':-progress*477.5,transform:'rotate(-90 110 110)',tabindex:0,'aria-label':`${label}: ${count} questions (${Math.round(100*count/total)}%)`});
      const title = svgEl('title'); title.textContent = `${label}: ${count} questions (${Math.round(100*count/total)}%)`; circle.append(title); svg.append(circle);
      progress += count/total;
    });
    const center = svgEl('text',{x:110,y:115,'text-anchor':'middle',class:'nx-chart-center'}); center.textContent=String(total); svg.append(center);
    const legend = node('ul','nx-pattern-legend');
    slices.forEach(([label,count],index) => { const item=node('li'); const swatch=node('span','nx-pattern-swatch'); swatch.style.background=palette[index]; item.append(swatch,node('span','',label),node('strong','',`${Math.round(100*count/total)}%`)); legend.append(item); });
    wrap.append(svg,legend); target.append(wrap);
  }

  function renderAnalysis() {
    results.hidden = !analysis || !analysis.paperCount;
    if (results.hidden) return;
    const stats = $('#nx-pattern-stats');
    const highest = [...analysis.groups].filter(group => group.marksKnown).sort((a,b) => b.totalMarks - a.totalMarks)[0];
    stats.replaceChildren(
      metric('Papers analyzed', analysis.paperCount, 'Uploaded to this browser'),
      metric('Questions found', analysis.totalQuestions, 'Numbered questions'),
      metric('Repeated groups', analysis.repeatedGroups, 'Seen in 2+ papers'),
      metric('Marks identified', analysis.marksKnown, `Of ${analysis.totalQuestions} questions`),
      metric('Highest weightage', highest ? `${highest.totalMarks} marks` : '—', highest ? highest.question : 'No marks extracted')
    );
    renderCharts();
    renderQuestions();
  }

  async function analyze() {
    if (!papers.length) { analysis = null; renderAnalysis(); return; }
    try {
      const response = await fetch(`${window.NEXORA_API_BASE || ''}/api/pattern/analyze`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({papers})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not analyze these papers.');
      analysis = data;
      aiTopics = new Map();
      renderAnalysis();
      setError('');
    } catch (problem) { setError(problem.message || 'Could not analyze these papers.'); }
  }

  async function storeFilesInVault(files) {
    if (!window.NexoraVaultFileStore) throw new Error('Vault file storage is unavailable. Reload Nexora and try again.');
    await window.NexoraVaultFileStore.putMany(files);
  }

  async function processFiles(files, {storeOriginals=false} = {}) {
    if (!files.length) return setError('Choose one or more PDF or TXT question papers.');
    if (files.some(file => !/\.(pdf|txt)$/i.test(file.name))) return setError('Every selected file must be a PDF or TXT question paper.');
    if (files.some(file => file.size > 4_000_000)) return setError('Each file must be under 4 MB for secure processing.');
    if (papers.length + files.length > 30) return setError(`You can add ${30-papers.length} more paper${30-papers.length===1?'':'s'}.`);
    setError('');
    addButton.disabled = true;
    const added=[]; const failures=[];
    progress.hidden=false;
    try {
      if (storeOriginals) {
        progress.textContent=`Saving ${files.length} original file${files.length===1?'':'s'} to Vault…`;
        await storeFilesInVault(files);
      }
      for (const [index,file] of files.entries()) {
        addButton.textContent=`Reading ${index+1} of ${files.length}…`;
        progress.textContent=`Processing ${file.name} (${index+1}/${files.length}). Scanned papers can take a minute while OCR and both AI models cross-check them.`;
        const inferredYear=file.name.match(/\b(20\d{2})\b/)?.[1] || '';
        const params = new URLSearchParams({name:file.name,year:yearInput.value.trim() || inferredYear});
        try {
          const response = await fetch(`${window.NEXORA_API_BASE || ''}/api/pattern/extract?${params}`, {method:'POST',headers:{'Content-Type':file.type || 'application/octet-stream'},body:file});
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Could not read this paper.');
          added.push(data.paper);
        } catch (problem) { failures.push(`${file.name}: ${problem.message || 'Could not read this paper.'}`); }
      }
      if (added.length) {
        papers.push(...added); sortPapersByYear(papers); persist(); savePapersToVault(added); pendingFiles=[]; form.reset(); renderPendingFiles(); renderPapers(); await analyze();
        progress.textContent=`Added ${added.length} paper${added.length===1?'':'s'}. The original files and extracted question banks are in Vault.`;
      }
      if (failures.length) setError(failures.join(' '));
    } catch (problem) { setError(problem.message || 'Could not save or analyze these papers.'); }
    finally { addButton.disabled = false; vaultAdd.disabled=false; addButton.innerHTML = 'Analyze selected files <svg class="nx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>'; renderPendingFiles(); if(!added.length) progress.hidden=true; }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await processFiles([...pendingFiles], {storeOriginals:true});
  });

  async function renderVaultPicker() {
    vaultFiles.replaceChildren();
    vaultAdd.disabled=true;
    try {
      const files=(await window.NexoraVaultFileStore.list()).filter(file => /\.(pdf|txt)$/i.test(file.name));
      if (!files.length) return vaultFiles.append(node('p','nx-pattern-empty','No PDF or TXT files are in Vault yet.'));
      vaultAdd.disabled=false;
      files.forEach(file => {
        const label=node('label','nx-pattern-vault-option');
        const checkbox=node('input'); checkbox.type='checkbox'; checkbox.value=file.id;
        const copy=node('span'); copy.append(node('strong','',file.name),node('small','',`${Math.max(1,Math.round(file.size/1024))} KB · ${new Date(file.createdAt).toLocaleDateString('en-IN')}`));
        label.append(checkbox,copy); vaultFiles.append(label);
      });
    } catch (problem) { vaultFiles.append(node('p','nx-form-error',problem.message || 'Could not read files from Vault.')); }
  }
  vaultOpen.addEventListener('click',async () => {
    vaultPicker.hidden=!vaultPicker.hidden;
    vaultOpen.setAttribute('aria-expanded',String(!vaultPicker.hidden));
    if (!vaultPicker.hidden) await renderVaultPicker();
  });
  vaultAdd.addEventListener('click',async () => {
    const ids=[...vaultFiles.querySelectorAll('input:checked')].map(input=>input.value);
    if (!ids.length) return setError('Select at least one PDF or TXT file from Vault.');
    vaultAdd.disabled=true;
    const records=(await Promise.all(ids.map(id=>window.NexoraVaultFileStore.get(id)))).filter(Boolean);
    const files=records.map(record=>new File([record.blob],record.name,{type:record.type,lastModified:Date.parse(record.createdAt) || Date.now()}));
    await processFiles(files);
    vaultPicker.hidden=true;
  });
  $('#nx-pattern-ai').disabled = true;
  sort.addEventListener('change',renderQuestions);
  saveReportButton.addEventListener('click',() => {
    const report=reportSnapshot(); if (!report) return;
    const stored=readStore('nexora-vault-pattern-reports');
    if (!writeStore('nexora-vault-pattern-reports',[report,...stored].slice(0,10))) return setError('Browser storage is full. Download the PDF instead.');
    window.dispatchEvent(new Event('nexora:vault-updated'));
    progress.hidden=false; progress.textContent='Pattern-analysis report saved to Vault.';
  });
  printReportButton.addEventListener('click',() => { const report=reportSnapshot(); if (report) openPatternPdf(report); });
  downloadReportButton.addEventListener('click',() => { const report=reportSnapshot(); if (report) downloadPatternPdf(report); });
  window.addEventListener('nexora:restore-paper',async event => {
    const paper=event.detail; if (!paper?.questions) return;
    if (!papers.some(item=>item.id===paper.id)) papers.push(paper);
    persist(); renderPapers(); await analyze();
  });
  window.addEventListener('nexora:restore-report',async event => {
    const report=event.detail; if (!Array.isArray(report?.papers)) return;
    papers=report.papers.slice(0,30); persist(); renderPapers(); await analyze();
  });
  window.addEventListener('nexora:restore-vault-files',async event => {
    const ids=Array.isArray(event.detail)?event.detail:[]; if (!ids.length) return;
    const records=(await Promise.all(ids.map(id=>window.NexoraVaultFileStore.get(id)))).filter(Boolean);
    const files=records.map(record=>new File([record.blob],record.name,{type:record.type,lastModified:Date.parse(record.createdAt) || Date.now()}));
    await processFiles(files);
  });
  window.addEventListener('nexora:open-pattern-pdf',event => { if(event.detail) openPatternPdf(event.detail); });
  renderPapers();
  analyze();
})();
