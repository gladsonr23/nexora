const test = require('node:test');
const assert = require('node:assert/strict');
const {render} = require('../../dist/assistant-markdown');

class TestElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  click() { this.listeners.click?.(); }
  set textContent(value) { this.children = [{tagName: '#text', text: String(value)}]; }
  get textContent() { return this.children.map(child => child.textContent ?? child.text ?? '').join(''); }
}

global.document = {
  createElement: tagName => new TestElement(tagName),
  createTextNode: text => ({tagName: '#text', text, textContent: text}),
};

function descendants(root) {
  return [root, ...root.children.flatMap(child => child.children ? descendants(child) : [child])];
}

test('renders session summaries as headings and nested lists, and normalizes merged citations to clickable chips', () => {
  const opened = [];
  const sources = [
    {number: 1, materialId: 'assembly-id', filename: 'Assembly.pdf', pageNumber: 2},
    {number: 2, materialId: 'java-id', filename: 'Java.pdf', pageNumber: 1},
  ];
  const view = render([
    'This session covers two subjects.',
    '## Overview', 'Two course files were summarized.',
    '## Key Concepts',
    '1. **Assembly** is a low-level language. [1, Page 2, 1, Page 2]',
    '  - The `MOV` instruction transfers data.',
    '2. **Java** uses classes and methods. [Source 2, Page 1]',
    '## Important Details', '- Projects can include `JAR` files.',
    '## Takeaways', '- Review both subjects.',
  ].join('\n'), sources, (source, page) => opened.push([source.materialId, page]));

  const nodes = descendants(view);
  assert.deepEqual(nodes.filter(node => node.tagName === 'h4').map(node => node.textContent), ['Overview', 'Key Concepts', 'Important Details', 'Takeaways']);
  assert.equal(nodes.filter(node => node.tagName === 'ol').length, 1);
  assert.equal(nodes.filter(node => node.tagName === 'ul').length, 3);
  const chips = nodes.filter(node => node.className === 'nx-chat-citation');
  assert.equal(chips.length, 2, 'duplicate source/page pairs in one bracket are deduplicated');
  assert.deepEqual(chips.map(chip => chip.textContent), ['Source 1 · p. 2', 'Source 2 · p. 1']);
  chips[0].click();
  assert.deepEqual(opened, [['assembly-id', 2]]);
  assert.doesNotMatch(view.textContent, /\[1, Page|\[Source 2/);
});

test('renders Markdown emphasis, inline and fenced code safely for a normal answer', () => {
  const view = render('Use **bold**, *italic*, and `MOV`.\n```asm\nmov rax, 60\n```\n\n<img src=x onerror=alert(1)>');
  const nodes = descendants(view);
  assert.equal(nodes.filter(node => node.tagName === 'strong').length, 1);
  assert.equal(nodes.filter(node => node.tagName === 'em').length, 1);
  assert.equal(nodes.filter(node => node.tagName === 'code').length, 2);
  assert.equal(nodes.some(node => node.tagName === 'img'), false);
  assert.match(view.textContent, /<img src=x onerror=alert\(1\)>/);
});
