import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanShareUrl, sharePayload } from '../assets/share.mjs';

test('shared quiz links remove diagnostic parameters and fragments', () => {
  assert.equal(
    cleanShareUrl('https://example.com/quizzes/house/?score=cinematic#scene-one'),
    'https://example.com/quizzes/house/',
  );
});

test('share payload keeps the quiz title and clean canonical link', () => {
  assert.deepEqual(
    sharePayload({ title: 'Can You Survive?', text: 'Enter the house.', url: 'https://example.com/quiz/?fresh=1' }),
    { title: 'Can You Survive?', text: 'Enter the house.', url: 'https://example.com/quiz/' },
  );
});
