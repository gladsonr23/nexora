(function (root) {
  const ink = [8, 30, 36];
  const teal = [2, 103, 127];
  const muted = [77, 91, 96];
  const line = [212, 225, 228];
  const yellow = [255, 181, 0];
  // Polaris TweakCN brand colours used by the Nexora dashboard.
  const logoLeft = [201, 230, 235];
  const logoRight = [152, 210, 219];
  const logoBase = [2, 103, 127];
  const logoShade = [50, 139, 160];
  const logoLetter = [8, 65, 80];

  function printable(value) {
    return String(value ?? '')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, '...')
      .replace(/[\u00d7\u2715]/g, 'x')
      .replace(/\u00f7/g, '/')
      .replace(/\u2264/g, '<=')
      .replace(/\u2265/g, '>=')
      .replace(/\u2192/g, '->')
      .replace(/\u03c0/g, 'pi')
      .replace(/\u221a/g, 'sqrt')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e\n]/g, ' ')
      .replace(/[ \t]+/g, ' ').trim();
  }

  function filename(note) {
    const base = printable(note.title).replace(/[^A-Za-z0-9 -]/g, '').replace(/\s+/g, '-').slice(0, 65) || 'study-guide';
    return `${base}.pdf`;
  }

  function drawBookLogo(doc, x, top, scale = 1) {
    const width = 11 * scale;
    const middle = x + width / 2;

    // Open pages.
    doc.setFillColor(...logoLeft);
    doc.triangle(x, top + 1 * scale, middle, top + 3 * scale, middle, top + 9 * scale, 'F');
    doc.setFillColor(...logoRight);
    doc.triangle(x + width, top + 1 * scale, middle, top + 3 * scale, middle, top + 9 * scale, 'F');

    // Layered lower book edge from the Polaris teal family.
    doc.setFillColor(...logoShade);
    doc.triangle(x - .7 * scale, top + 6.8 * scale, middle, top + 9 * scale, middle, top + 10.3 * scale, 'F');
    doc.setFillColor(...logoBase);
    doc.triangle(x + width + .7 * scale, top + 6.8 * scale, middle, top + 9 * scale, middle, top + 10.3 * scale, 'F');

    // The dark centre stroke forms Nexora's N/spine.
    doc.setDrawColor(...logoLetter); doc.setLineWidth(.85 * scale);
    doc.line(x + 1.3 * scale, top + 1.8 * scale, x + 1.3 * scale, top + 6.7 * scale);
    doc.line(x + 1.3 * scale, top + 1.8 * scale, middle, top + 8.8 * scale);
    doc.line(middle, top + 3 * scale, middle, top + 9 * scale);

    // Gold page flip accent.
    doc.setFillColor(...yellow);
    doc.triangle(middle, top + 3 * scale, middle + 3.5 * scale, top, middle + 3.5 * scale, top + 4.5 * scale, 'F');
    doc.setDrawColor(...logoLetter); doc.setLineWidth(.35 * scale);
    doc.line(x, top + 1 * scale, middle, top + 3 * scale);
    doc.line(x, top + 1 * scale, x, top + 7 * scale);
    doc.line(x, top + 7 * scale, middle, top + 9 * scale);
    doc.line(x + width, top + 1 * scale, middle, top + 3 * scale);
    doc.line(x + width, top + 1 * scale, x + width, top + 7 * scale);
    doc.line(x + width, top + 7 * scale, middle, top + 9 * scale);
  }

  function createStudyGuidePdf(note, Pdf = root.jspdf?.jsPDF) {
    if (!Pdf) throw new Error('PDF tools are unavailable. Reload Nexora and try again.');
    if (!note || !Array.isArray(note.sections) || !note.sections.length) throw new Error('This study guide cannot be exported.');
    const doc = new Pdf({orientation:'portrait', unit:'mm', format:'a4', compress:true});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 19;
    const contentWidth = pageWidth - 2 * margin;
    const bottom = pageHeight - 25;
    let y = 30;

    function watermark() {
      doc.saveGraphicsState();
      try { doc.setGState(new doc.GState({opacity:.045})); }
      catch (_) { doc.setTextColor(231, 240, 242); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...teal);
      doc.text('NEXORA', pageWidth / 2, pageHeight / 2, {angle:28, align:'center'});
      doc.restoreGraphicsState();
    }

    function header() {
      watermark();
      doc.setFillColor(...teal); doc.rect(0, 0, pageWidth, 4, 'F');
      drawBookLogo(doc, margin, 8.5, .78);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...logoLetter);
      doc.text('NEXORA', margin + 11, 14.8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...logoBase);
      doc.text('/  STUDY NOTES', margin + 30, 14.8);
      doc.setDrawColor(...line); doc.line(margin, 20, pageWidth - margin, 20);
      y = 30;
    }
    function space(height) {
      if (y + height > bottom) { doc.addPage(); header(); }
    }
    function paragraph(value, {size = 10.5, leading = 5.3, indent = 0, color = ink, after = 0, bold = false} = {}) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
      const lines = doc.splitTextToSize(printable(value), contentWidth - indent);
      for (const text of lines) {
        space(leading);
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
        doc.text(text, margin + indent, y); y += leading;
      }
      y += after;
    }
    function sectionHeading(value, timestamp) {
      space(timestamp ? 28 : 20);
      y += 4;
      doc.setDrawColor(...line); doc.line(margin, y, pageWidth - margin, y); y += 7;
      if (timestamp) { paragraph(timestamp, {size:8.5, leading:4.5, color:teal, bold:true, after:2}); }
      doc.setFont('times', 'bold'); doc.setFontSize(15);
      for (const text of doc.splitTextToSize(printable(value), contentWidth)) {
        space(7); doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...ink);
        doc.text(text, margin, y); y += 7;
      }
      y += 2;
    }

    header();
    doc.setFillColor(...yellow); doc.rect(margin, y, 14, 1.3, 'F'); y += 11;
    doc.setFont('times', 'bold'); doc.setFontSize(23);
    for (const text of doc.splitTextToSize(printable(note.title), contentWidth)) {
      space(10); doc.setFont('times', 'bold'); doc.setFontSize(23); doc.setTextColor(...ink);
      doc.text(text, margin, y); y += 10;
    }
    y += 4;
    const date = note.createdAt && !Number.isNaN(Date.parse(note.createdAt)) ? new Date(note.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    paragraph(`Generated ${date}  |  YouTube lecture`, {size:8.5, leading:5, color:muted, after:5});
    paragraph(note.overview, {size:11, leading:6, after:3});

    note.sections.forEach((section, index) => {
      sectionHeading(`${String(index + 1).padStart(2, '0')}  ${section.heading}`, section.timestamp);
      for (const point of section.points || []) {
        space(6); doc.setFillColor(...teal); doc.circle(margin + 1.3, y - 1.4, .8, 'F');
        paragraph(point, {indent:6, leading:5.5, after:2});
      }
    });

    sectionHeading('Key takeaways');
    for (const [index, takeaway] of (note.takeaways || []).entries()) {
      paragraph(`${index + 1}.  ${takeaway}`, {indent:0, leading:5.5, after:2});
    }
    if (note.sourceUrl) {
      space(18); y += 5; paragraph('SOURCE VIDEO', {size:8, leading:4.5, color:teal, bold:true, after:1});
      paragraph(note.sourceUrl, {size:8.5, leading:4.5, color:muted});
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page); doc.setDrawColor(...line); doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
      doc.text('Nexora study guide', margin, pageHeight - 12);
      doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 12, {align:'right'});
    }
    doc.setProperties({title:printable(note.title), subject:'Nexora study guide', creator:'Nexora'});
    return doc;
  }

  function patternFilename(report) {
    const date=report?.createdAt && !Number.isNaN(Date.parse(report.createdAt)) ? new Date(report.createdAt).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
    return `Nexora-Prof-Pattern-${date}.pdf`;
  }

  function createPatternReportPdf(report, Pdf = root.jspdf?.jsPDF) {
    if (!Pdf) throw new Error('PDF tools are unavailable. Reload Nexora and try again.');
    if (!report?.analysis?.groups?.length) throw new Error('Analyze at least one question paper before exporting.');
    const doc=new Pdf({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const width=doc.internal.pageSize.getWidth(), height=doc.internal.pageSize.getHeight(), margin=16, bottom=height-20;
    const groups=report.analysis.groups, papers=report.papers || [], topics=report.topics || [], trend=report.trend || [];
    let y=28;
    function header(label='PROF PATTERN REPORT') { doc.setFillColor(...teal);doc.rect(0,0,width,4,'F');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...teal);doc.text(`NEXORA  /  ${label}`,margin,15);doc.setDrawColor(...line);doc.line(margin,19,width-margin,19);y=28; }
    function newPage(label) { doc.addPage();header(label); }
    function ensure(amount,label='QUESTION ANALYSIS') { if(y+amount>bottom)newPage(label); }
    function text(value,x,yPos,max,size=8.5,color=ink,bold=false) { doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(printable(value),max);doc.text(lines,x,yPos);return lines.length*(size*.38+1.1); }
    function fitLine(value,maxWidth,size=7,bold=false) { doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);let label=printable(value);if(doc.getTextWidth(label)<=maxWidth)return label;while(label.length>1&&doc.getTextWidth(`${label}...`)>maxWidth)label=label.slice(0,-1);return `${label.trim()}...`; }
    function panel(x,yPos,w,h,title,subtitle) { doc.setFillColor(249,252,252);doc.setDrawColor(...line);doc.setLineWidth(.25);doc.roundedRect(x,yPos,w,h,2.5,2.5,'FD');text(title,x+5,yPos+8,w-10,10,ink,true);text(subtitle,x+5,yPos+14,w-10,7.2,muted); }
    function barChart(x,yPos,w,h,items,unit) {
      const maximum=Math.max(1,...items.map(item=>item.value)); const chartTop=yPos+24, row=Math.min(10,(h-28)/Math.max(items.length,1));
      items.slice(0,5).forEach((item,index)=>{const top=chartTop+index*row;const value=`${item.value} ${unit}`;doc.setFont('helvetica','bold');doc.setFontSize(6.2);const valueWidth=doc.getTextWidth(value);doc.setTextColor(...teal);doc.text(value,x+w-5,top,{align:'right'});doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(...ink);doc.text(fitLine(item.label,w-valueWidth-16,6.2),x+5,top);const trackWidth=w-10;doc.setFillColor(228,238,240);doc.roundedRect(x+5,top+2,trackWidth,2.7,1,1,'F');doc.setFillColor(...(index===0?yellow:teal));doc.roundedRect(x+5,top+2,Math.max(2,trackWidth*item.value/maximum),2.7,1,1,'F');});
    }
    function trendChart(x,yPos,w,h,items) {
      const left=x+10,right=x+w-6,top=yPos+24,base=yPos+h-10;
      doc.setDrawColor(...line);for(const level of [0,50,100]){const yy=base-(base-top)*level/100;doc.line(left,yy,right,yy);text(`${level}%`,x+1,yy+1,9,5.8,muted);}
      if(items.length<2){text('Add papers from at least two years.',x+9,yPos+39,w-18,7.5,muted);return;}
      const points=items.map((item,index)=>({x:left+(right-left)*index/(items.length-1),y:base-(base-top)*item.value/100,...item}));
      doc.setDrawColor(...teal);doc.setLineWidth(.8);for(let i=1;i<points.length;i++)doc.line(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
      points.forEach(point=>{doc.setFillColor(...teal);doc.circle(point.x,point.y,1.3,'F');text(point.year,point.x-6,base+5,12,5.8,muted);});
    }
    function pieChart(x,yPos,w,h,items) {
      const slices=items.slice(0,4).map(item=>({label:item.topic,value:item.count}));const other=items.slice(4).reduce((sum,item)=>sum+item.count,0);if(other)slices.push({label:'Other topics',value:other});
      const total=slices.reduce((sum,item)=>sum+item.value,0)||1,cx=x+25,cy=yPos+44,r=14,palette=[teal,yellow,[59,157,140],[147,109,178],[139,154,161]];let angle=-Math.PI/2;
      slices.forEach((slice,index)=>{const end=angle+Math.PI*2*slice.value/total;doc.setFillColor(...palette[index]);const steps=Math.max(2,Math.ceil((end-angle)/(Math.PI/24)));for(let step=0;step<steps;step++){const a=angle+(end-angle)*step/steps,b=angle+(end-angle)*(step+1)/steps;doc.triangle(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r,cx+Math.cos(b)*r,cy+Math.sin(b)*r,'F');}angle=end;});
      slices.forEach((slice,index)=>{const yy=yPos+28+index*8;const percent=`${Math.round(100*slice.value/total)}%`;doc.setFillColor(...palette[index]);doc.rect(x+47,yy-2.5,3,3,'F');doc.setFont('helvetica','normal');doc.setFontSize(6.1);doc.setTextColor(...ink);doc.text(fitLine(slice.label,w-73,6.1),x+53,yy);doc.setFont('helvetica','bold');doc.setTextColor(...muted);doc.text(percent,x+w-5,yy,{align:'right'});});
    }

    header();doc.setFillColor(...yellow);doc.rect(margin,y,15,1.3,'F');y+=10;
    text('Prof Pattern Analysis',margin,y,width-2*margin,23,ink,true);y+=15;
    text(`Generated ${new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN')}  |  ${report.analysis.paperCount} papers  |  ${report.analysis.totalQuestions} questions`,margin,y,width-2*margin,8.5,muted);y+=12;
    const metrics=[['PAPERS',report.analysis.paperCount],['QUESTIONS',report.analysis.totalQuestions],['REPEATED',report.analysis.repeatedGroups],['MARKS FOUND',report.analysis.marksKnown]];
    metrics.forEach((item,index)=>{const x=margin+index*44.5;doc.setFillColor(249,252,252);doc.setDrawColor(...line);doc.roundedRect(x,y,40,20,2,2,'FD');text(item[0],x+4,y+6,32,6.2,muted,true);text(String(item[1]),x+4,y+15,32,13,ink,true);});y+=28;
    const cellW=(width-2*margin-7)/2,cellH=69;
    panel(margin,y,cellW,cellH,'Most repeated questions','Distinct papers containing each question');
    barChart(margin,y,cellW,cellH,groups.filter(group=>group.paperCount>1).slice(0,5).map(group=>({label:group.question,value:group.paperCount})),'papers');
    panel(margin+cellW+7,y,cellW,cellH,'Topics by marks','Total printed marks found');
    barChart(margin+cellW+7,y,cellW,cellH,topics.filter(item=>item.marks>0).slice(0,5).map(item=>({label:item.topic,value:item.marks})),'marks');y+=cellH+7;
    panel(margin,y,cellW,cellH,'Repeated questions over time','Share matching another paper');trendChart(margin,y,cellW,cellH,trend);
    panel(margin+cellW+7,y,cellW,cellH,'Topic share','Share of detected occurrences');pieChart(margin+cellW+7,y,cellW,cellH,topics);y+=cellH+9;
    ensure(28);text('Included papers',margin,y,width-2*margin,12,ink,true);y+=7;
    papers.forEach(paper=>{ensure(7);y+=text(`${paper.year || 'No year'}  |  ${paper.filename}  |  ${paper.questions?.length || 0} questions`,margin,y,width-2*margin,7.5,muted)+1;});
    newPage('QUESTION ANALYSIS');
    text('Ranked question groups',margin,y,width-2*margin,18,ink,true);y+=11;
    groups.forEach((group,index)=>{const lines=doc.splitTextToSize(printable(group.question),width-2*margin-8);const need=18+lines.length*4;ensure(need);doc.setFillColor(249,252,252);doc.setDrawColor(...line);doc.roundedRect(margin,y-4,width-2*margin,need-2,2,2,'FD');text(String(index+1).padStart(2,'0'),margin+4,y+3,10,7,teal,true);text(group.question,margin+14,y+3,width-2*margin-23,8.3,ink,true);const metaY=y+8+lines.length*4;text(`${group.paperCount}/${report.analysis.paperCount} papers  |  ${group.count} occurrences  |  ${group.marksKnown?`${group.totalMarks} total marks`:'marks not found'}  |  ${printable(group.topic)}`,margin+14,metaY,width-2*margin-23,6.6,muted);y+=need+3;});
    const pageCount=doc.getNumberOfPages();for(let page=1;page<=pageCount;page++){doc.setPage(page);doc.setDrawColor(...line);doc.line(margin,height-15,width-margin,height-15);text('Nexora Prof Pattern Detector',margin,height-9,width-2*margin,7,muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...muted);doc.text(`${page} / ${pageCount}`,width-margin,height-9,{align:'right'});}
    doc.setProperties({title:'Nexora Prof Pattern Analysis',subject:'Historical question-paper analysis',creator:'Nexora'});
    return doc;
  }

  root.NexoraPdf = {createStudyGuidePdf, filename, createPatternReportPdf, patternFilename};
})(globalThis);
