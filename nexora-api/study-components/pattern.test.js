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

test('extracts explicit mark labels and section marks for question occurrences', () => {
  const paper = parseQuestionPaper([
    {number: 1, text: 'PART A (20 x 2=40 Marks)\n1. Calculate the value of x squared. [8]\n2. Explain the boundary condition. Marks: 10\nPART B\n3. Derive the complete equation.'}
  ]);

  assert.deepEqual(paper.questions.map(question => [question.number, question.marks, question.markSource]), [
    [1, 8, 'explicit'],
    [2, 10, 'explicit'],
    [3, null, null],
  ]);
});

test('uses a section total for one question and ignores contradictory OCR formula tails', () => {
  const paper = parseQuestionPaper([
    {number: 1, text: 'PART C (1x11==15 Marks)\n1. Find the Fourier cosine transform.\nPART A (1x11 155 arks)\n2. Calculate the transform of this function.'}
  ]);

  assert.deepEqual(paper.questions.map(question => [question.number, question.marks, question.markSource]), [
    [1, 15, 'section'],
    [2, null, null],
  ]);
});
