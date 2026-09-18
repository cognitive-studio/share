import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreProfileForScene,
  endingProfile,
  normalizeSoundPreference,
} from '../quizzes/youre-next-survival/assets/audio.mjs';

test('score intensity rises across the seven-scene case', () => {
  const profiles = Array.from({ length: 8 }, (_, index) => scoreProfileForScene(index));
  assert.equal(profiles[0].intensity, 0.12);
  assert.equal(profiles[7].intensity, 1);
  assert.ok(profiles.every((profile, index) => index === 0 || profile.intensity >= profiles[index - 1].intensity));
  assert.ok(profiles[7].filterFrequency > profiles[0].filterFrequency);
  assert.ok(profiles[7].pulseRate > profiles[0].pulseRate);
});

test('scene profiles clamp invalid or excessive progress safely', () => {
  assert.deepEqual(scoreProfileForScene(-10), scoreProfileForScene(0));
  assert.deepEqual(scoreProfileForScene(99), scoreProfileForScene(7));
  assert.deepEqual(scoreProfileForScene('not-a-number'), scoreProfileForScene(0));
});

test('ending profiles give triumph, failure, and secret chaos different treatments', () => {
  assert.equal(endingProfile('baptised-by-fire').mode, 'controlled-triumph');
  assert.equal(endingProfile('did-not-make-it').mode, 'hard-cut');
  assert.equal(endingProfile('everyone-dies').mode, 'last-note');
  assert.equal(endingProfile('architect').mode, 'survived');
});

test('unknown endings receive the standard survived treatment', () => {
  assert.deepEqual(endingProfile('unknown-result'), endingProfile('house-guest'));
});

test('stored sound preferences default on and recognize explicit off values', () => {
  assert.equal(normalizeSoundPreference(null), true);
  assert.equal(normalizeSoundPreference('on'), true);
  assert.equal(normalizeSoundPreference('off'), false);
  assert.equal(normalizeSoundPreference('unexpected'), true);
});

