import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGameState,
  getScene,
  getAvailableChoices,
  choose,
  evaluateRun,
  getProgress,
} from '../quizzes/youre-next-survival/assets/game.mjs';

function play(choiceIds, options = {}) {
  return choiceIds.reduce((state, choiceId) => choose(state, choiceId), createGameState(options));
}

const earnedRoute = [
  'inspect-windows',
  'watch-reflections',
  'track-angle',
  'funnel-hallway',
  'pretend-join',
  'feed-false-route',
  'expose-inside',
];

test('a new run begins at arrival with no visible progress', () => {
  const state = createGameState();
  assert.equal(getScene(state).id, 'arrival');
  assert.equal(getProgress(state), 0);
  assert.deepEqual(state.history, []);
});

test('earlier observation unlocks a later preparation', () => {
  let state = createGameState();
  state = choose(state, 'inspect-windows');
  state = choose(state, 'watch-reflections');
  state = choose(state, 'track-angle');

  const available = getAvailableChoices(state).map((choice) => choice.id);
  assert.ok(available.includes('funnel-hallway'));
  assert.ok(!available.includes('arm-kitchen'));
});

test('a coherent seven-choice run earns the highest competency rank', () => {
  const state = play(earnedRoute);
  assert.equal(state.view, 'result');
  assert.equal(state.history.length, 7);
  assert.equal(getProgress(state), 100);
  assert.equal(evaluateRun(state).slug, 'baptised-by-fire');
});

test('the highest rank rewards controlled adaptation without requiring one exact route', () => {
  const state = play([
    'inspect-windows',
    'seat-kitchen',
    'track-angle',
    'funnel-hallway',
    'pretend-join',
    'spring-funnel',
    'turn-factions',
  ]);
  assert.equal(evaluateRun(state).slug, 'baptised-by-fire');
});

test('violent choices without awareness do not earn the highest rank', () => {
  const state = play([
    'pour-wine',
    'seat-kitchen',
    'rush-door',
    'arm-kitchen',
    'refuse-loudly',
    'kitchen-ambush',
    'charge-last-mask',
  ]);
  assert.notEqual(evaluateRun(state).slug, 'baptised-by-fire');
  assert.equal(evaluateRun(state).slug, 'did-not-make-it');
});

test('false cooperation can resolve as the counterfeit victim', () => {
  const state = play([
    'read-family',
    'provoke-crispian',
    'play-dead',
    'darken-house',
    'pretend-join',
    'feed-false-route',
    'walk-away-smiling',
  ]);
  assert.equal(evaluateRun(state).slug, 'counterfeit-victim');
});

test('genuine cooperation without leverage resolves as the volunteer', () => {
  const state = play([
    'pour-wine',
    'seat-exit',
    'pull-down',
    'barricade-room',
    'accept-offer',
    'follow-orders',
    'commit-conspiracy',
  ]);
  assert.equal(evaluateRun(state).slug, 'volunteer');
});

test('the perfect-chaos route unlocks Everyone Dies but Kendra', () => {
  const state = play([
    'pour-wine',
    'seat-kitchen',
    'play-dead',
    'arm-kitchen',
    'accept-offer',
    'kitchen-ambush',
    'eliminate-witnesses',
  ]);
  const result = evaluateRun(state);
  assert.equal(result.slug, 'everyone-dies');
  assert.equal(result.secret, true);
});

test('the replay variant changes the breach while preserving scene count', () => {
  const fox = createGameState({ variant: 'fox' });
  const lamb = createGameState({ variant: 'lamb' });
  assert.notEqual(getScene(fox).variantNote, getScene(lamb).variantNote);
  assert.equal(fox.history.length, 0);
  assert.equal(lamb.history.length, 0);
});

test('unavailable and out-of-sequence choices are rejected', () => {
  assert.throws(() => choose(createGameState(), 'funnel-hallway'), /not available/i);
  assert.throws(() => choose(createGameState(), 'not-a-choice'), /unknown choice/i);
});
