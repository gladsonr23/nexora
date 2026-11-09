const test = require('node:test');
const assert = require('node:assert/strict');
const {parseQuestionPaper} = require('./pattern.js');

test('attaches an OCR question stem that begins on the line after its number', () => {
  const paper = parseQuestionPaper([
    {number: 1, text: '1.\nThe partial differential equation formed by eliminating arbitrary constants.\n(A) option one\n(B) option two\n9.\nIn the partial differential equation, what does the symbol stand for?\n10. How many initial and boundary conditions are required to solve the equation?'}
  ]);

  assert.deepEqual(paper.questions.map(question => question.number), [1, 9, 10]);
  assert.match(paper.questions[1].text, /what does the symbol stand for/i);
});

test('deduplicates overlapping OCR detections of the same numbered question', () => {
  const paper = parseQuestionPaper([
    {number: 1, text: '1.\nThe complete integral of the given partial differential equation.\n1. The complete integral of the given partial differential equation.'}
  ]);

  assert.equal(paper.questions.length, 1);
  assert.equal(paper.questions[0].number, 1);
});
