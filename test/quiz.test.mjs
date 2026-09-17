import test from 'node:test';
import assert from 'node:assert/strict';
import {
  questions,
  results,
  scoreQuiz,
  getProgress,
  createQuizState,
  startQuiz,
  answerQuestion,
  goBack,
  resetQuiz,
} from '../quizzes/youre-next-couple/assets/quiz.mjs';

const answersFor = (letter) => questions.map((question) => `${question.id}-${letter}`);

test('all A answers resolve to Paul + Aubrey', () => {
  assert.equal(scoreQuiz(answersFor('a')).slug, 'paul-aubrey');
});

test('all B answers resolve to Drake + Kelly', () => {
  assert.equal(scoreQuiz(answersFor('b')).slug, 'drake-kelly');
});

test('all C answers resolve to Aimee + Tariq', () => {
  assert.equal(scoreQuiz(answersFor('c')).slug, 'aimee-tariq');
});

test('all D answers resolve to Erin + Crispian', () => {
  assert.equal(scoreQuiz(answersFor('d')).slug, 'erin-crispian');
});

test('all E answers resolve to Felix + Zee', () => {
  assert.equal(scoreQuiz(answersFor('e')).slug, 'felix-zee');
});

test('an even strategic and dark split unlocks Erin + Zee', () => {
  const answers = questions.map((question, index) => `${question.id}-${index % 2 === 0 ? 'd' : 'e'}`);
  assert.equal(scoreQuiz(answers).slug, 'erin-zee');
});

test('a slight strategic lead does not accidentally unlock the hybrid', () => {
  const answers = questions.map((question, index) => `${question.id}-${index < 8 ? 'd' : 'e'}`);
  assert.equal(scoreQuiz(answers).slug, 'erin-crispian');
});

test('duplicate or incomplete answer sets are rejected', () => {
  assert.throws(() => scoreQuiz(answersFor('a').slice(0, 11)), /all 12 questions/i);
  const duplicated = answersFor('a');
  duplicated[11] = duplicated[0];
  assert.throws(() => scoreQuiz(duplicated), /one answer per question/i);
});

test('result data contains five canonical outcomes and one secret outcome', () => {
  assert.equal(Object.keys(results).length, 6);
  assert.equal(results['erin-zee'].secret, true);
});

test('progress is expressed as a clamped percentage', () => {
  assert.equal(getProgress(-1), 0);
  assert.equal(getProgress(0), 0);
  assert.equal(getProgress(6), 50);
  assert.equal(getProgress(12), 100);
  assert.equal(getProgress(99), 100);
});

test('quiz state moves from cover to questions and stores one answer at a time', () => {
  const started = startQuiz(createQuizState());
  assert.equal(started.view, 'question');
  assert.equal(started.index, 0);

  const advanced = answerQuestion(started, 'q1-a');
  assert.deepEqual(advanced.answers, ['q1-a']);
  assert.equal(advanced.index, 1);
});

test('the twelfth answer moves quiz state to the result view', () => {
  let state = startQuiz(createQuizState());
  answersFor('e').forEach((answerId) => { state = answerQuestion(state, answerId); });
  assert.equal(state.view, 'result');
  assert.equal(state.answers.length, 12);
});

test('back removes the latest answer and restart restores the cover', () => {
  let state = answerQuestion(startQuiz(createQuizState()), 'q1-d');
  state = goBack(state);
  assert.equal(state.index, 0);
  assert.deepEqual(state.answers, []);
  assert.deepEqual(resetQuiz(state), createQuizState());
});
