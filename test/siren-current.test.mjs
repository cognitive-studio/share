import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import {
  advanceCombination,
  collectCurrentEntity,
  performSirenCall,
  rushPhaseAt,
  selectCurrentTarget,
  spawnCurrentEntity,
  spawnTier,
  stepCurrent,
} from '../games/siren-shore/assets/current.mjs';
import { currentViewportFor } from '../games/siren-shore/assets/app.mjs';
import { ITEM_ARCHETYPES } from '../games/siren-shore/assets/data.mjs';

function currentStateWith(entity) {
  const state = createDefaultState(() => 0.25);
  state.mode = 'ocean';
  state.current.entities = [entity];
  return state;
}

test('spawned treasure enters above the portrait viewport and falls downward', () => {
  const state = createDefaultState(() => 0.25);
  const entity = spawnCurrentEntity(state, () => 0.25, { width: 390, height: 844 });
  assert.equal(entity.kind, 'treasure');
  assert.ok(entity.y < 0);
  assert.ok(entity.vy > 0);
  assert.ok(entity.shape);
});

test('the app camera wiring spawns above the visible portrait viewport away from world origin', () => {
  const state = createDefaultState(() => 0.25);
  state.player.x = 900;
  state.player.y = 1000;
  const viewport = currentViewportFor(state.player, { width: 390, height: 844 }, { width: 1800, height: 1400 });
  const entity = spawnCurrentEntity(state, () => 0.25, viewport);
  assert.equal(viewport.cameraX, 705);
  assert.equal(viewport.cameraY, 556);
  assert.ok(entity.y < viewport.cameraY, 'spawn must enter above the visible camera rectangle');
  assert.ok(entity.x >= viewport.cameraX && entity.x <= viewport.cameraX + viewport.width);
});

test('each current silhouette receives an item with matching semantic identity', () => {
  const rolls = [0.10, 0.40, 0.60, 0.72, 0.76, 0.90];
  const expectedNames = ['coin', 'pearl', 'jewel', 'crown', 'bag', 'junk'];
  for (const [index, roll] of rolls.entries()) {
    const state = createDefaultState(() => 0.25);
    const entity = spawnCurrentEntity(state, () => roll, { width: 390, height: 844 });
    const archetype = ITEM_ARCHETYPES.find(({ id }) => id === entity.archetypeId);
    assert.equal(entity.archetypeId, expectedNames[index]);
    assert.match(entity.item.name.toLowerCase(), new RegExp(expectedNames[index]));
    assert.match(entity.item.description.toLowerCase(), new RegExp(expectedNames[index]));
    assert.equal(entity.item.slot, archetype.slot);
    assert.equal(entity.item.category, archetype.slot === 'treasure' ? 'Find' : 'Adornment');
  }
});

test('nearest target chooses one actionable entity inside the radius', () => {
  const target = selectCurrentTarget({ x: 100, y: 100 }, [
    { id: 'far', x: 280, y: 100, actionable: true },
    { id: 'near', x: 120, y: 100, actionable: true },
  ], 70);
  assert.equal(target.id, 'near');
});

test('collection transfers provenance and awards permanent points', () => {
  const state = currentStateWith({
    id: 'coin-entity', kind: 'treasure', archetypeId: 'coin', shape: 'coin',
    chain: 'gold', points: 4006, actionable: true,
    item: { id: 'coin-item', name: 'Municipal Gold Coin', slot: 'treasure', ownerId: null, history: [] },
  });
  const result = collectCurrentEntity(state, state.current.entities[0].id);
  assert.equal(result.state.progression.points, 4006);
  assert.equal(result.state.inventory[0].ownerId, 'player');
  assert.match(result.state.inventory[0].history.at(-1), /Treasure Current/);
  assert.equal(result.events[0].type, 'pickup');
  assert.equal(result.events[0].category, 'coin');
  assert.equal(result.events[0].combo, 1);
  assert.equal(result.events[0].rarity, 'Interesting');
});

test('Siren Call reveals nearby concealed treasure when no target is active', () => {
  const state = currentStateWith({
    id: 'hidden-1', kind: 'treasure', tier: 'concealed', revealed: false,
    x: 0, y: 0, actionable: false,
  });
  state.current.entities[0].x = state.player.x + 100;
  state.current.entities[0].y = state.player.y;
  const result = performSirenCall(state, state.player, state.current.entities);
  assert.equal(result.state.current.entities[0].revealed, true);
  assert.ok(result.events.some(({ type }) => type === 'sirenCall'));
});

test('Siren Call ignores malformed or non-concealed hidden current entities', () => {
  const state = currentStateWith({ id: 'old-find', kind: 'find', tier: 'concealed', revealed: false, x: 0, y: 0, actionable: false });
  state.current.entities.push({ id: 'ambient-1', kind: 'treasure', tier: 'ambient', revealed: false, x: 0, y: 0, actionable: false });
  state.current.entities[0].x = state.player.x + 100;
  state.current.entities[0].y = state.player.y;
  state.current.entities[1].x = state.player.x + 100;
  state.current.entities[1].y = state.player.y;
  const result = performSirenCall(state, state.player, state.current.entities);
  assert.equal(result.state.current.entities[0].revealed, false);
  assert.equal(result.state.current.entities[0].actionable, false);
  assert.equal(result.state.current.entities[1].revealed, false);
  assert.equal(result.state.current.entities[1].actionable, false);
  assert.equal(result.events[0].revealed, 0);
});

test('spawn tiers preserve the ambient, concealed, legendary rhythm', () => {
  assert.equal(spawnTier(0.10), 'ambient');
  assert.equal(spawnTier(0.85), 'concealed');
  assert.equal(spawnTier(0.97), 'legendary');
});

test('current stepping retires fallen ambient treasure and announces a new target', () => {
  const state = createDefaultState(() => 0.25);
  state.mode = 'ocean';
  state.current.entities = [
    { id: 'gone', tier: 'ambient', x: 30, y: 950, vx: 0, vy: 90, actionable: true },
    { id: 'target', tier: 'ambient', x: state.player.x + 20, y: state.player.y, vx: 0, vy: 90, actionable: true },
  ];
  const result = stepCurrent(state, 0, { width: 390, height: 844 }, () => 0.25);
  assert.deepEqual(result.state.current.entities.map(({ id }) => id), ['target']);
  assert.ok(result.events.some(({ type }) => type === 'currentRetired'));
  assert.ok(result.events.some(({ type, entityId }) => type === 'targetChanged' && entityId === 'target'));
});

test('matching categories build a multiplier and unrelated treasure resolves it without losing points', () => {
  const first = advanceCombination({ chain: null, count: 0, multiplier: 1 }, { chain: 'gold' });
  const third = advanceCombination(advanceCombination(first.combo, { chain: 'gold' }).combo, { chain: 'gold' });
  assert.equal(third.combo.count, 3);
  assert.equal(third.combo.multiplier, 2);
  const changed = advanceCombination(third.combo, { chain: 'pearl' });
  assert.equal(changed.resolved.count, 3);
  assert.deepEqual(changed.combo, { chain: 'pearl', count: 1, multiplier: 1 });
});

test('Treasure Rush spawns more treasure than drift during the same interval', () => {
  const drift = createDefaultState(() => 0.25);
  drift.mode = 'ocean';
  drift.current.nextRushAt = 999;
  const rush = structuredClone(drift);
  rush.current.rush = 'rush';
  rush.current.rushEndsAt = 999;
  const viewport = { width: 390, height: 844 };
  const drifted = stepCurrent(drift, 2.4, viewport, () => 0.25);
  const rushed = stepCurrent(rush, 2.4, viewport, () => 0.25);
  assert.equal(drifted.state.current.entities.length, 1);
  assert.ok(rushed.state.current.entities.length > drifted.state.current.entities.length);
});

test('Treasure Rush can start at 90 seconds and lasts from 15 to 25 seconds', () => {
  const min = rushPhaseAt({ rush: 'drift', rushEndsAt: 0 }, 45, () => 0);
  assert.equal(min.current.rushEndsAt - 45, 15);
  const waiting = rushPhaseAt({ rush: 'drift', rushEndsAt: 0 }, 89.99, () => 1);
  assert.equal(waiting.current.rush, 'drift');
  const max = rushPhaseAt(waiting.current, 90, () => 1);
  assert.equal(max.current.rush, 'rush');
  assert.equal(max.current.rushEndsAt - 90, 25);
});

test('Treasure Rush summary includes collected-treasure counters', () => {
  const state = currentStateWith({
    id: 'rush-coin', kind: 'treasure', archetypeId: 'coin', shape: 'coin', chain: 'gold', points: 4006, actionable: true,
    item: { id: 'rush-coin-item', name: 'Municipal Gold Coin', slot: 'treasure', ownerId: null, history: [] },
  });
  state.current.rush = 'rush';
  state.current.rushEndsAt = 10;
  const collected = collectCurrentEntity(state, 'rush-coin');
  const ended = rushPhaseAt(collected.state.current, 10.01, () => 0.5);
  const summary = ended.events.find(({ type }) => type === 'rushSummary');
  assert.deepEqual({ finds: summary.finds, points: summary.points }, { finds: 1, points: 4006 });
});

test('a freshly reset current schedules its first rush instead of starting immediately', () => {
  const waiting = rushPhaseAt({ rush: 'drift', rushEndsAt: 0, nextRushAt: 0 }, 0.1, () => 0);
  assert.equal(waiting.current.rush, 'drift');
  assert.equal(waiting.current.nextRushAt, 45);
});

test('the current introduces a visible zone hazard and announces a scheduled swell', () => {
  const state = createDefaultState(() => 0.25);
  state.mode = 'ocean';
  state.current.elapsed = 14.99;
  state.current.nextSwellAt = 15;
  const result = stepCurrent(state, .02, { width: 390, height: 844 }, () => 0);
  assert.ok(result.state.current.entities.some((entity) => entity.kind === 'hazard'));
  assert.ok(result.events.some(({ type }) => type === 'swellWarning'));
});

test('reclaiming jellyfish-released property does not duplicate its provenance record', () => {
  const state = currentStateWith({
    id: 'released-bag', kind: 'treasure', releasedBy: 'jellyfish', archetypeId: 'released', shape: 'bag', chain: 'junk', points: 0, actionable: true,
    item: { id: 'bag-item', name: 'Disputed Bag', slot: 'purse', ownerId: null, history: ['Claimed.', 'Released by jellyfish.'] },
  });
  state.inventory = [{ ...state.current.entities[0].item }];
  const result = collectCurrentEntity(state, 'released-bag');
  assert.equal(result.state.inventory.filter(({ id }) => id === 'bag-item').length, 1);
  assert.equal(result.state.inventory[0].ownerId, 'player');
  assert.match(result.state.inventory[0].history.at(-1), /claimed/i);
  assert.equal(result.events[0].recovery, true);
});
