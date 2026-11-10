(() => {
  const citationGroupPattern = /^((?:Source\s*)?\d+\s*,\s*Page\s*\d+)(?:\s*,\s*(?:Source\s*)?\d+\s*,\s*Page\s*\d+)*$/i;
  const citationPairPattern = /(?:Source\s*)?(\d+)\s*,\s*Page\s*(\d+)/gi;

  function formatInline(parent, text, sources, onCitation) {
    const tokenPattern = /(\[((?:Source\s*)?\d+\s*,\s*Page\s*\d+(?:\s*,\s*(?:Source\s*)?\d+\s*,\s*Page\s*\d+)*)\]|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*)/g;
    let cursor = 0;
    for (const match of text.matchAll(tokenPattern)) {
      if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
      if (match[2] && citationGroupPattern.test(match[2])) {
        const references = [];
        citationPairPattern.lastIndex = 0;
        for (const pair of match[2].matchAll(citationPairPattern)) {
          const number = Number(pair[1]);
          const pageNumber = Number(pair[2]);
          if (!references.some(item => item.number === number && item.pageNumber === pageNumber)) references.push({number, pageNumber});
        }
        for (const reference of references) {
          const source = sources.find(item => Number(item.number) === reference.number);
          if (!source?.materialId) continue;
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'nx-chat-citation';
          chip.dataset.materialId = source.materialId;
          chip.dataset.pageNumber = String(reference.pageNumber);
          chip.textContent = `Source ${reference.number} · p. ${reference.pageNumber}`;
          chip.setAttribute('aria-label', `Open ${source.filename}, page ${reference.pageNumber}`);
          chip.addEventListener('click', () => onCitation(source, reference.pageNumber));
          parent.append(chip);
        }
      } else if (match[3]) {
        const code = document.createElement('code');
        code.textContent = match[3];
        parent.append(code);
      } else if (match[4]) {
        const strong = document.createElement('strong');
        strong.textContent = match[4];
        parent.append(strong);
      } else if (match[5]) {
        const emphasis = document.createElement('em');
        emphasis.textContent = match[5];
        parent.append(emphasis);
      }
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
  }

  function splitInlineNumberedList(text) {
    const markers = [...text.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+/g)];
    const start = markers.findIndex((marker, index) => Number(marker[1]) === 1 && Number(markers[index + 1]?.[1]) === 2);
    if (start < 0) return text;
    const sequence = markers.slice(start).filter((marker, index, items) => Number(marker[1]) === index + 1);
    if (sequence.length < 2) return text;
    const breaks = sequence
      .map(marker => marker.index + marker[0].lastIndexOf(marker[1]))
      .filter(position => text.slice(text.lastIndexOf('\n', position - 1) + 1, position).trim());
    let output = text;
    for (const position of breaks.reverse()) output = `${output.slice(0, position)}\n${output.slice(position)}`;
    return output;
  }

  function render(text, sources = [], onCitation = () => {}) {
    const root = document.createElement('div');
    root.className = 'nx-chat-answer-copy';
    const normalized = splitInlineNumberedList(String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\bFor ([^,\n]+), the key ideas include:[ \t]*/gi, '\n### $1\n')
      .replace(/(\S)[ \t]+-[ \t]+(?=[A-Z*`])/g, '$1\n- ')
      .replace(/(\S)[ \t]+•[ \t]+/g, '$1\n- '));
    const lines = normalized.split('\n');
    let paragraph = [];
    let listStack = [];
    const closeParagraph = () => {
      if (!paragraph.length) return;
      const element = document.createElement('p');
      formatInline(element, paragraph.join('\n'), sources, onCitation);
      root.append(element);
      paragraph = [];
    };
    const closeLists = () => { listStack = []; };

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const line = rawLine.trim();
      if (/^```/.test(line)) {
        closeParagraph();
        closeLists();
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++]);
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeLines.join('\n');
        pre.append(code);
        root.append(pre);
        continue;
      }
      if (!line) { closeParagraph(); closeLists(); continue; }

      const heading = line.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        closeParagraph();
        closeLists();
        const element = document.createElement('h4');
        formatInline(element, heading[1], sources, onCitation);
        root.append(element);
        continue;
      }

      const listItem = rawLine.match(/^(\s*)([-*+]\s+|\d+[.)]\s+)(.+)$/);
      if (listItem) {
        closeParagraph();
        const indent = listItem[1].replace(/\t/g, '  ').length;
        const type = /^\d/.test(listItem[2]) ? 'ol' : 'ul';
        while (listStack.length && indent < listStack.at(-1).indent) listStack.pop();
        let current = listStack.at(-1);
        if (!current || indent > current.indent) {
          const nested = Boolean(current?.lastItem);
          const list = document.createElement(type);
          list.className = 'nx-chat-answer-list';
          (nested ? current.lastItem : root).append(list);
          current = {indent, type, list, lastItem: null};
          listStack.push(current);
        } else if (indent === current.indent && type !== current.type) {
          listStack.pop();
          const list = document.createElement(type);
          list.className = 'nx-chat-answer-list';
          root.append(list);
          current = {indent, type, list, lastItem: null};
          listStack.push(current);
        }
        const item = document.createElement('li');
        formatInline(item, listItem[3], sources, onCitation);
        current.list.append(item);
        current.lastItem = item;
        continue;
      }

      closeLists();
      paragraph.push(line);
    }
    closeParagraph();
    return root;
  }

  const api = {render};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.NexoraAssistantMarkdown = api;
})();
