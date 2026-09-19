import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import { resolveHazard, scheduleSwell, stepSwell, swellForce } from '../games/siren-shore/assets/hazards.mjs';
import { collectCurrentEntity, stepCurrent } from '../games/siren-shore/assets/current.mjs';
import { shouldSurfaceOceanEvent } from '../games/siren-shore/assets/app.mjs';

function hazardState(archetypeId = 'jellyfish') {
  const state = createDefaultState(() => 0.5);
  state.mode = 'ocean';
  const item = { id: 'bag-item', name: 'Disputed Bag', slot: 'purse', ownerId: 'player', history: ['Claimed at the rehearsal dinner.'] };
  state.inventory.push(item);
  state.purseIds.push(item.id);
  state.current.entities.push({ id: `${archetypeId}-1`, kind: 'hazard', archetypeId, x: state.player.x, y: state.player.y });
  return state;
}

test('jellyfish releases one carried object without deleting its provenance', () => {
  const state = hazardState('jellyfish');
  const result = resolveHazard(state, 'jellyfish-1', () => 0);
  const item = result.state.inventory.find(({ id }) => id === state.purseIds[0]);
  assert.equal(item.ownerId, null);
  assert.equal(result.state.purseIds.length, 0);
  assert.match(item.history.at(-1), /jellyfish/i);
  assert.ok(result.state.current.entities.some((entity) => entity.kind === 'treasure' && entity.item?.id === item.id));
  assert.ok(result.events.some(({ type }) => type === 'itemReleased'));
});

test('released jellyfish property remains recoverable after it passes the normal Current retirement boundary', () => {
  const state = hazardState('jellyfish');
  const released = resolveHazard(state, 'jellyfish-1', () => 0).state;
  const entity = released.current.entities.find(({ kind }) => kind === 'treasure');
  entity.y = 1100;
  const advanced = stepCurrent(released, 1, { width: 390, height: 844, cameraY: 0 }, () => 0.5).state;
  assert.ok(advanced.current.entities.some(({ id }) => id === entity.id), 'released property must not retire like ordinary ambient treasure');
  const recovered = collectCurrentEntity(advanced, entity.id);
  assert.equal(recovered.state.inventory.filter(({ id }) => id === 'bag-item').length, 1);
  assert.equal(recovered.state.inventory.find(({ id }) => id === 'bag-item').ownerId, 'player');
});

test('eel changes temporary hair state and awards poor-judgment points', () => {
  const state = hazardState('eel');
  const result = resolveHazard(state, 'eel-1', () => 0.5);
  assert.equal(result.state.player.effects.hair, 'electric');
  assert.ok(result.state.progression.points > state.progression.points);
  assert.ok(result.state.progression.level > state.progression.level);
  assert.equal(result.state.player.title, 'Publicly Misunderstood Siren');
  assert.ok(result.events.some(({ type }) => type === 'pointAward'));
  assert.equal(shouldSurfaceOceanEvent('pointAward'), true);
  assert.equal(shouldSurfaceOceanEvent('levelUp'), true);
  assert.ok(result.events.some(({ type }) => type === 'lookChanged'));
});

test('squid changes the public record without harming inventory or Siren Points', () => {
  const state = hazardState('squid');
  state.progression.points = 4006;
  const result = resolveHazard(state, 'squid-1', () => 0.5);
  assert.equal(result.state.player.effects.makeup, 'inked');
  assert.equal(result.state.inventory.length, state.inventory.length);
  assert.ok(result.state.progression.points >= state.progression.points);
});

test('swell warns before applying bounded force and always ends', () => {
  const scheduled = scheduleSwell({ swell: null }, 120, () => 0);
  assert.equal(scheduled.current.swell.phase, 'warning');
  assert.ok(scheduled.events.some(({ type }) => type === 'swellWarning'));
  const active = stepSwell(scheduled.current.swell, 4.1);
  assert.equal(active.phase, 'active');
  const ended = stepSwell(active, 9);
  assert.equal(ended, null);
});

test('swell scheduling remains irregular and force respects viewport edges', () => {
  const first = scheduleSwell({ swell: null, nextSwellAt: 0 }, 0, () => 0.5);
  assert.equal(first.current.swell, null);
  assert.equal(first.current.nextSwellAt, 180);
  const warning = scheduleSwell(first.current, 180, () => 0.5).current.swell;
  const active = stepSwell(warning, 4);
  assert.deepEqual(swellForce(active, { x: 10, y: 100, minX: 10, maxX: 200, minY: 10, maxY: 200 }), { x: 0, y: 0 });
  const middle = swellForce(active, { x: 100, y: 100, minX: 10, maxX: 200, minY: 10, maxY: 200 });
  assert.ok(Math.hypot(middle.x, middle.y) > 0 && Math.hypot(middle.x, middle.y) <= active.strength);
});
