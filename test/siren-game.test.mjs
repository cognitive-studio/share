import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import {
  advanceShore,
  acquireCurrentItem,
  collectFind,
  createOuting,
  equipItem,
  packItem,
  remixItems,
  resolveCombination,
  resolveEncounter,
  resolveFightMove,
  returnHome,
  resumeOuting,
} from '../games/siren-shore/assets/game.mjs';

const low = () => 0.01;
const high = () => 0.99;
const middle = () => 0.5;

function currentStateWithPoints(points) {
  const state = createDefaultState(() => 0.5);
  state.progression.points = points;
  return state;
}

function seedState() {
  const state = createDefaultState(() => 0.4);
  state.inventory.push({
    id: 'tiara-1', name: 'Emotionally Unavailable Tiara', description: 'It has boundaries.',
    category: 'Adornment', slot: 'crown', rarity: 'Important to Her', colors: ['#fff', '#f0f'],
    ownerId: 'cynthia', origin: 'Discovered at the Disputed Reef.', history: ['Found by Cynthia.'], parents: [],
  });
  state.npcs.cynthia.possessions.push('tiara-1');
  return state;
}

test('an outing creates finds without mutating the home state', () => {
  const home = createDefaultState(() => 0.2);
  const { state, events } = createOuting(home, middle);
  assert.equal(home.mode, 'home');
  assert.equal(state.mode, 'ocean');
  assert.ok(state.shore.finds.length >= 8);
  assert.match(events[0].text, /ocean/i);
});

test('a new outing starts its own falling Treasure Current', () => {
  const home = createDefaultState(() => 0.2);
  home.current.entities = [{ id: 'old-current', y: 500 }];
  home.current.elapsed = 11;
  const { state } = createOuting(home, middle);
  assert.deepEqual(state.current.entities, []);
  assert.equal(state.current.elapsed, 0);
  assert.equal(home.current.entities[0].id, 'old-current');
});

test('advancing to a fresh shore retires the previous Treasure Current', () => {
  const state = createOuting(createDefaultState(() => 0.2), middle).state;
  state.current.entities = [{ id: 'previous-current', y: 500 }];
  state.current.elapsed = 11;
  const result = advanceShore(state, middle);
  assert.deepEqual(result.state.current.entities, []);
  assert.equal(result.state.current.elapsed, 0);
});

test('re-entering an existing shore starts a fresh Treasure Current', () => {
  const ocean = createOuting(createDefaultState(() => 0.2), middle).state;
  ocean.current.entities = [{ id: 'stale-current', y: 500 }];
  ocean.current.elapsed = 11;
  const home = returnHome(ocean).state;
  const result = resumeOuting(home);
  assert.equal(result.state.shore.id, ocean.shore.id);
  assert.deepEqual(result.state.current.entities, []);
  assert.equal(result.state.current.elapsed, 0);
});

test('an outing gives recurring NPCs property worth starting drama over', () => {
  const { state } = createOuting(createDefaultState(() => 0.2), middle);
  for (const npc of Object.values(state.npcs)) {
    assert.ok(npc.possessions.length >= 1, `${npc.name} arrived empty-handed`);
    const item = state.inventory.find(({ id }) => id === npc.possessions[0]);
    assert.equal(item.ownerId, npc.id);
    assert.match(item.history[0], new RegExp(npc.name));
  }
});

test('collecting appends provenance and awards legend points', () => {
  const outing = createOuting(createDefaultState(() => 0.2), middle).state;
  const find = outing.shore.finds[0];
  const result = collectFind(outing, find.id);
  const item = result.state.inventory.find(({ id }) => id === find.item.id);
  assert.equal(item.ownerId, 'player');
  assert.match(item.history.at(-1), /claimed by Your Majesty/i);
  assert.ok(result.state.progression.points > 0);
  assert.ok(result.state.purseIds.includes(item.id), 'new finds must remain at risk until home');
});

test('a legendary Current pickup preserves its tier at a one-times combo', () => {
  const state = createDefaultState(() => 0.2);
  const entity = {
    id: 'current-legendary', tier: 'legendary', points: 388000,
    item: { id: 'item-legendary', name: 'Public Crown', slot: 'crown', rarity: 'Interesting', ownerId: null, history: [], colors: ['#fff1d0', '#ff4faf'] },
  };
  const result = acquireCurrentItem(state, entity, 1);
  const pickup = result.events.find(({ type }) => type === 'rarePickup');
  assert.equal(pickup.tier, 'legendary');
  assert.equal(pickup.multiplier, 1);
});

test('a full purse prevents claiming more field loot', () => {
  const outing = createOuting(createDefaultState(() => 0.2), middle).state;
  outing.player.purse = 'clam';
  outing.purseIds = ['a', 'b', 'c'];
  const find = outing.shore.finds[0];
  const result = collectFind(outing, find.id);
  assert.equal(result.state.shore.finds[0].collected, false);
  assert.equal(result.state.inventory.some(({ id }) => id === find.item.id), false);
  assert.match(result.events[0].text, /full/i);
});

test('purse capacity creates risk without limiting home storage', () => {
  const state = createDefaultState();
  state.player.purse = 'clam';
  state.inventory = Array.from({ length: 4 }, (_, i) => ({ id: `x-${i}`, name: `Thing ${i}`, slot: 'treasure', history: [] }));
  let current = state;
  for (let i = 0; i < 3; i += 1) current = packItem(current, `x-${i}`).state;
  const rejected = packItem(current, 'x-3');
  assert.equal(rejected.state.purseIds.length, 3);
  assert.match(rejected.events[0].text, /full/i);
  assert.equal(rejected.state.inventory.length, 4);
});

test('remixing preserves ancestry and consumes source objects', () => {
  const state = createDefaultState();
  state.inventory = [
    { id: 'a', name: 'Pearl Emergency', slot: 'jewelry', colors: ['#fff', '#0ff'], history: ['Found.'], parents: [] },
    { id: 'b', name: 'Municipal Fork', slot: 'weapon', colors: ['#aaa', '#f0f'], history: ['Confiscated.'], parents: [] },
  ];
  const result = remixItems(state, ['a', 'b'], middle);
  assert.equal(result.state.inventory.length, 1);
  assert.deepEqual(result.state.inventory[0].parents.map(({ id }) => id), ['a', 'b']);
  assert.match(result.state.inventory[0].history.at(-1), /remixed/i);
});

test('remixing clears equipment references to consumed objects', () => {
  const state = createDefaultState();
  state.inventory = [
    { id: 'a', name: 'Pearl Emergency', slot: 'jewelry', colors: ['#fff', '#0ff'], history: [], parents: [], ownerId: 'player' },
    { id: 'b', name: 'Municipal Fork', slot: 'weapon', colors: ['#aaa', '#f0f'], history: [], parents: [], ownerId: 'player' },
  ];
  state.equipped = { jewelry: 'a', weapon: 'b' };
  const result = remixItems(state, ['a', 'b'], middle);
  assert.deepEqual(result.state.equipped, {});
});

test('an NPC remembers a stolen tiara when it is worn later', () => {
  const stolen = resolveEncounter(seedState(), 'cynthia', 'snatch', low);
  const itemId = stolen.events.find(({ itemId }) => itemId)?.itemId;
  assert.ok(itemId);
  const equipped = equipItem(stolen.state, itemId);
  const reunion = resolveEncounter(equipped.state, 'cynthia', 'greet', middle);
  assert.match(reunion.events.map(({ text }) => text).join(' '), /tiara/i);
  assert.ok(reunion.state.npcs.cynthia.rivalry > 0);
});

test('leaving an encounter is a complete choice with no penalty', () => {
  const state = seedState();
  const before = structuredClone(state.npcs.marina);
  const result = resolveEncounter(state, 'marina', 'leave', middle);
  assert.deepEqual(result.state.npcs.marina, before);
  assert.match(result.events[0].text, /peace/i);
});

test('SNATCH READ FLOURISH resolves nonlethally and can move property', () => {
  let state = seedState();
  state.mode = 'fight';
  state.fight = { npcId: 'cynthia', playerScore: 0, npcScore: 0, round: 0 };
  for (const move of ['read', 'flourish', 'snatch']) {
    state = resolveFightMove(state, 'cynthia', move, high).state;
  }
  assert.equal(state.mode, 'ocean');
  assert.equal(state.fight, null);
  assert.equal(state.lastIncident.type, 'altercation');
  assert.ok(state.npcs.cynthia.wins + state.npcs.cynthia.losses === 1);
});

test('altercation spoils keep one durable object record and append their history', () => {
  const state = seedState();
  state.mode = 'fight';
  state.fight = { npcId: 'cynthia', playerScore: 1, npcScore: 0, round: 2 };
  const result = resolveFightMove(state, 'cynthia', 'read', low);
  const spoils = result.state.inventory.filter(({ id }) => id === 'tiara-1');
  assert.equal(spoils.length, 1);
  assert.equal(spoils[0].ownerId, 'player');
  assert.equal(result.state.npcs.cynthia.possessions.includes('tiara-1'), false);
  assert.match(spoils[0].history.at(-1), /won from/i);
});

test('an unfinished fight records the current read for an accurate receipt', () => {
  const state = seedState();
  state.mode = 'fight';
  state.fight = { npcId: 'cynthia', playerScore: 0, npcScore: 0, round: 0 };
  const result = resolveFightMove(state, 'cynthia', 'read', low);
  assert.equal(result.state.mode, 'fight');
  assert.equal(result.state.lastIncident.type, 'read');
  assert.match(result.state.lastIncident.text, /Cynthia/i);
});

test('losing equipped property removes it from the public look', () => {
  let state = seedState();
  state.mode = 'ocean';
  const stolen = resolveEncounter(state, 'cynthia', 'snatch', low).state;
  const item = stolen.inventory.find(({ ownerId }) => ownerId === 'player');
  state = equipItem(stolen, item.id).state;
  state.mode = 'fight';
  state.fight = { npcId: 'cynthia', playerScore: 0, npcScore: 0, round: 2 };
  const result = resolveFightMove(state, 'cynthia', 'read', high);
  assert.equal(result.state.equipped[item.slot], undefined);
  assert.equal(result.state.npcs.cynthia.possessions.includes(item.id), true);
});

test('returning home protects possessions and the next shore never ends the game', () => {
  const outing = createOuting(createDefaultState(), middle).state;
  const home = returnHome(outing).state;
  const next = advanceShore(home, middle).state;
  assert.equal(home.mode, 'home');
  assert.deepEqual(home.purseIds, [], 'everything is secured after returning home');
  assert.equal(next.mode, 'ocean');
  assert.equal(next.progression.shores, 1);
  assert.ok(next.shore.name);
});

test('lifetime Siren Points never decrease when a combination ends', () => {
  const state = currentStateWithPoints(500000);
  const result = resolveCombination(state, { chain: 'gold', count: 4, multiplier: 3 });
  assert.ok(result.state.progression.points >= 500000);
});
