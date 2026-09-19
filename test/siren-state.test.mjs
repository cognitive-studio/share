import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, createDefaultState, levelForPoints, loadState, nextId, pointsForLevel, saveState } from '../games/siren-shore/assets/state.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    keys: () => [...values.keys()],
  };
}

test('default state is a playable versioned mermaid life', () => {
  const state = createDefaultState();
  assert.equal(state.version, 3);
  assert.equal(state.player.name, 'Your Majesty');
  assert.equal(state.progression.level, 1);
  assert.deepEqual(state.world, { seed: state.world.seed, distance: 0, zoneIndex: 0, zones: [], history: [] });
  assert.deepEqual(state.current, { entities: [], elapsed: 0, rush: 'drift', rushEndsAt: 0, combo: { chain: null, count: 0, multiplier: 1 }, swell: null });
  assert.deepEqual(state.social, { relationships: {}, rumors: [], incidents: [], pursuits: [], clock: { elapsed: 0, nextSceneAt: 60 } });
  assert.deepEqual(state.effects, { recentAwards: [] });
  assert.equal(Object.hasOwn(state.progression, 'xp'), false);
  assert.equal(state.settings.music, true);
  assert.equal(state.settings.haptics, true);
  assert.ok(Object.keys(state.npcs).length >= 8);
});

test('ids remain stable and monotonically increasing', () => {
  const state = createDefaultState();
  assert.equal(nextId(state, 'item'), 'item-1');
  assert.equal(nextId(state, 'item'), 'item-2');
});

test('level math remains finite without a cap', () => {
  const points = pointsForLevel(100000);
  assert.ok(Number.isSafeInteger(points));
  assert.equal(levelForPoints(points), 100000);
  assert.equal(levelForPoints(points + 1), 100000);
});

test('save round trip preserves accumulated nonsense', () => {
  const storage = memoryStorage();
  const state = createDefaultState();
  state.progression.points = 8675309;
  state.inventory.push({ id: 'fork-1', name: 'Haunted Salad Fork', history: ['Found while avoiding Cynthia.'] });
  assert.equal(saveState(storage, state).ok, true);
  const loaded = loadState(storage);
  assert.equal(loaded.warning, null);
  assert.equal(loaded.state.inventory[0].name, 'Haunted Salad Fork');
});

test('partial legacy NPC records merge with playable defaults', () => {
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 1, npcs: { cynthia: { friendship: 7 } } }) });
  const loaded = loadState(storage);
  assert.equal(loaded.state.npcs.cynthia.friendship, 7);
  assert.equal(loaded.state.npcs.cynthia.name, 'Cynthia Undertow');
  assert.deepEqual(loaded.state.npcs.cynthia.possessions, []);
  assert.deepEqual(loaded.state.npcs.cynthia.memories, []);
});

test('schema-invalid parsed saves are preserved and replaced safely', () => {
  const raw = JSON.stringify({ version: 2, shore: null });
  const storage = memoryStorage({ [SAVE_KEY]: raw });
  const loaded = loadState(storage, () => 987);
  assert.equal(loaded.recovered, true);
  assert.match(loaded.warning, /recovered/i);
  assert.equal(storage.getItem('siren-shore:recovery:987'), raw);
  assert.ok(loaded.state.shore.name);
});

test('invalid nested save entries and orphaned fights recover safely', () => {
  for (const candidate of [
    { version: 2, inventory: [null] },
    { version: 2, shore: { name: 'Still Named', finds: [null] } },
    { version: 2, mode: 'fight' },
  ]) {
    const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(candidate) });
    const loaded = loadState(storage, () => 654);
    assert.equal(loaded.recovered, true);
    assert.equal(loaded.state.mode, 'home');
    assert.ok(loaded.state.inventory.every(Boolean));
  }
});

test('partial legacy item records normalize into safe collectible objects', () => {
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({
    version: 2,
    inventory: [{ id: 'x', ownerId: 'player', history: null }],
    shore: { name: 'Still Named', finds: [{ id: 'f', x: 600, y: 500, item: {} }] },
  }) });
  const loaded = loadState(storage);
  assert.equal(loaded.recovered, false);
  assert.equal(loaded.state.inventory[0].slot, 'treasure');
  assert.deepEqual(loaded.state.inventory[0].history, []);
  assert.ok(loaded.state.shore.finds[0].item.name);
  assert.ok(Array.isArray(loaded.state.shore.finds[0].item.history));
});

test('fight references and required NPC fields retain integrity', () => {
  const brokenFight = memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 2, mode: 'fight', fight: { npcId: 'not-in-cast', round: 1 } }) });
  assert.equal(loadState(brokenFight, () => 321).recovered, true);

  const patchedNpc = memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 2, npcs: { cynthia: { palette: null, name: null, possessions: null } } }) });
  const loaded = loadState(patchedNpc);
  assert.equal(loaded.recovered, false);
  assert.equal(loaded.state.npcs.cynthia.name, 'Cynthia Undertow');
  assert.ok(loaded.state.npcs.cynthia.palette.length >= 2);
  assert.deepEqual(loaded.state.npcs.cynthia.possessions, []);
});

test('corrupt saves are preserved and replaced with a playable state', () => {
  const storage = memoryStorage({ 'siren-shore:save:v2': '{ruined' });
  const loaded = loadState(storage, () => 123456789);
  assert.equal(loaded.recovered, true);
  assert.match(loaded.warning, /recovered/i);
  assert.equal(storage.getItem('siren-shore:recovery:123456789'), '{ruined');
  assert.equal(loaded.state.version, 3);
});

test('unavailable storage falls back to memory without blocking play', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const loaded = loadState(storage);
  assert.match(loaded.warning, /browser/i);
  assert.equal(loaded.state.version, 3);
  assert.equal(saveState(storage, loaded.state).ok, false);
});

test('v2 save migrates into v3 without losing accumulated nonsense', () => {
  const v2Fixture = {
    version: 2,
    player: { hair: 4, name: 'Your Majesty' },
    inventory: [{ id: 'tiara-1', name: 'Haunted Tiara', slot: 'crown', ownerId: 'player', history: ['Found.'] }],
    progression: { xp: 8675309, level: 295, shores: 2, finds: 7, incidents: 3 },
  };
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(v2Fixture) });
  const { state, recovered } = loadState(storage);
  assert.equal(recovered, false);
  assert.equal(state.version, 3);
  assert.equal(state.inventory[0].name, v2Fixture.inventory[0].name);
  assert.equal(state.player.hair, v2Fixture.player.hair);
  assert.equal(state.progression.points, v2Fixture.progression.xp);
  assert.equal(Object.hasOwn(state.progression, 'xp'), false);
  assert.equal(state.world.zoneIndex, 0);
  assert.deepEqual(state.social.relationships, {});
});

test('oversized saved social history is bounded, summarized, and scheduled safely on load', () => {
  const incidents = Array.from({ length: 84 }, (_, index) => ({ id: `incident-${index}`, type: 'confrontation', actorId: 'marina', targetId: 'cynthia', witnesses: ['beatrice'], public: true }));
  const rumors = Array.from({ length: 44 }, (_, index) => ({ id: `rumor-${index}`, actorId: 'marina', targetId: 'cynthia' }));
  const memories = Array.from({ length: 135 }, (_, index) => ({ type: 'old', index }));
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 3, npcs: { marina: { memories }, cynthia: { memories: [] } }, social: { incidents, rumors, clock: { elapsed: 300, nextSceneAt: -1 } } }) });
  const { state, recovered } = loadState(storage);
  assert.equal(recovered, false);
  assert.equal(state.social.incidents.length, 80);
  assert.equal(state.social.rumors.length, 40);
  assert.ok(state.npcs.marina.memories.length <= 120);
  assert.ok(state.npcs.marina.memories.some(({ type }) => type === 'retiredIncident'));
  assert.ok(state.npcs.cynthia.memories.some(({ type }) => type === 'retiredIncident'));
  assert.equal(state.social.clock.nextSceneAt - state.social.clock.elapsed, 60);
  const farFuture = loadState(memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 3, social: { clock: { elapsed: 300, nextSceneAt: 9999 } } }) })).state;
  assert.equal(farFuture.social.clock.nextSceneAt - farFuture.social.clock.elapsed, 180);
});
