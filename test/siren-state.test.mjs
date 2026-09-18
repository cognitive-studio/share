import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, levelForXp, loadState, nextId, saveState, xpForLevel } from '../games/siren-shore/assets/state.mjs';

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
  assert.equal(state.version, 2);
  assert.equal(state.player.name, 'Your Majesty');
  assert.equal(state.progression.level, 1);
  assert.equal(state.settings.music, true);
  assert.ok(Object.keys(state.npcs).length >= 8);
});

test('ids remain stable and monotonically increasing', () => {
  const state = createDefaultState();
  assert.equal(nextId(state, 'item'), 'item-1');
  assert.equal(nextId(state, 'item'), 'item-2');
});

test('level math remains finite without a cap', () => {
  const xp = xpForLevel(100000);
  assert.ok(Number.isSafeInteger(xp));
  assert.equal(levelForXp(xp), 100000);
  assert.equal(levelForXp(xp + 1), 100000);
});

test('save round trip preserves accumulated nonsense', () => {
  const storage = memoryStorage();
  const state = createDefaultState();
  state.progression.xp = 8675309;
  state.inventory.push({ id: 'fork-1', name: 'Haunted Salad Fork', history: ['Found while avoiding Cynthia.'] });
  assert.equal(saveState(storage, state).ok, true);
  const loaded = loadState(storage);
  assert.equal(loaded.warning, null);
  assert.equal(loaded.state.inventory[0].name, 'Haunted Salad Fork');
});

test('corrupt saves are preserved and replaced with a playable state', () => {
  const storage = memoryStorage({ 'siren-shore:save:v2': '{ruined' });
  const loaded = loadState(storage, () => 123456789);
  assert.equal(loaded.recovered, true);
  assert.match(loaded.warning, /recovered/i);
  assert.equal(storage.getItem('siren-shore:recovery:123456789'), '{ruined');
  assert.equal(loaded.state.version, 2);
});

test('unavailable storage falls back to memory without blocking play', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const loaded = loadState(storage);
  assert.match(loaded.warning, /browser/i);
  assert.equal(loaded.state.version, 2);
  assert.equal(saveState(storage, loaded.state).ok, false);
});
