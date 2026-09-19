import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceForState, createEffectsPool, pursuitCueFor, pushEffect, semanticShapeForCurrentEntity, semanticShapeForItem, shapeForArchetype, visualEffectForEvent } from '../games/siren-shore/assets/render.mjs';
import { generateItem } from '../games/siren-shore/assets/data.mjs';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';

test('equipped finds become visible appearance layers', () => {
  const state = createDefaultState();
  state.player.scales = 2;
  state.player.fins = 1;
  state.inventory.push({ id: 'crown-1', slot: 'crown', ownerId: 'player', colors: ['#f0f', '#0ff'] });
  state.equipped.crown = 'crown-1';
  const appearance = appearanceForState(state);
  assert.equal(appearance.equippedItems.length, 1);
  assert.equal(appearance.equippedItems[0].slot, 'crown');
  assert.equal(appearance.equippedItems[0].colors[0], '#f0f');
  assert.equal(appearance.scales, 2);
  assert.equal(appearance.fins, 1);
});

test('temporary hazard looks become visible appearance layers', () => {
  const state = createDefaultState();
  state.player.effects = { hair: 'electric', makeup: 'inked' };
  const appearance = appearanceForState(state);
  assert.equal(appearance.effects.hair, 'electric');
  assert.equal(appearance.effects.makeup, 'inked');
});

test('a scheduled pursuit exposes a named, directional visual cue', () => {
  const state = createDefaultState();
  const cue = pursuitCueFor(state, { npcId: 'cynthia', entry: 'below' });
  assert.match(cue.label, /CYNTHIA IS COMING UP/);
  assert.equal(cue.entry, 'below');
  assert.equal(pursuitCueFor(state, { npcId: 'not-a-mermaid' }), null);
});

test('collectible archetypes map to distinct readable shapes', () => {
  assert.equal(shapeForArchetype('coin'), 'coin');
  assert.equal(shapeForArchetype('crown'), 'crown');
  assert.equal(shapeForArchetype('bag'), 'bag');
  assert.equal(shapeForArchetype('jewel'), 'gem');
  assert.notEqual(shapeForArchetype('crown'), shapeForArchetype('bag'));
});

test('effects pool caps ornament before gameplay entities', () => {
  const pool = createEffectsPool({ reducedMotion: false, maxParticles: 96 });
  for (let index = 0; index < 200; index += 1) pushEffect(pool, { type: 'sparkle', x: 10, y: 10 });
  assert.equal(pool.particles.length, 96);
});

test('reduced motion replaces animated target pulse with static emphasis', () => {
  const pool = createEffectsPool({ reducedMotion: true, maxParticles: 96 });
  pushEffect(pool, { type: 'target', x: 20, y: 30 });
  assert.equal(pool.emphasis.at(-1).motion, 'static');
  assert.equal(pool.particles.length, 0);
});

test('ordinary shore-find slots receive deliberate distinct silhouettes', () => {
  const jewelry = semanticShapeForItem({ slot: 'jewelry', name: 'Chandelier Earring' });
  const weapon = semanticShapeForItem({ slot: 'weapon', name: 'Champagne Sabre' });
  const hair = semanticShapeForItem({ slot: 'hair', name: 'Unlicensed Wiglet' });
  const makeup = semanticShapeForItem({ slot: 'makeup', name: 'Compact Mirror' });
  assert.equal(jewelry, 'gem');
  assert.equal(weapon, 'weapon');
  assert.equal(hair, 'hair');
  assert.equal(makeup, 'makeup');
  assert.equal(new Set([jewelry, weapon, hair, makeup]).size, 4);
});

test('generated catalog items keep object/slot silhouettes ahead of material adjectives', () => {
  const expected = { crown: 'crown', purse: 'bag', jewelry: 'gem', treasure: 'treasure', hair: 'hair', makeup: 'makeup', clothing: 'clothing', shoe: 'shoe', glove: 'glove', weapon: 'weapon' };
  const seen = new Set();
  for (let index = 1; index <= 900; index += 1) {
    const item = generateItem(() => index / 997, { id: `catalog-${index}` });
    seen.add(item.slot);
    assert.equal(semanticShapeForItem(item), expected[item.slot], `${item.name} should remain a ${item.slot}`);
  }
  assert.deepEqual([...seen].sort(), Object.keys(expected).sort());
  assert.equal(semanticShapeForItem({ slot: 'purse', name: 'Gold-Plated Clam Clutch' }), 'bag');
  assert.equal(semanticShapeForItem({ slot: 'weapon', name: 'Pearl Champagne Sabre' }), 'weapon');
  assert.equal(semanticShapeForItem({ slot: 'treasure', name: 'Gold-Plated Goblet' }), 'treasure');
});

test('a recognized explicit shape survives an unknown archetype', () => {
  assert.equal(semanticShapeForItem({ archetypeId: 'mystery', shape: 'crown', slot: 'treasure' }), 'crown');
  assert.equal(semanticShapeForItem({ archetypeId: 'mystery', shape: 'unlicensed-blob' }), 'junk');
});

test('live Current entity models preserve released shapes and degrade unknowns safely', () => {
  assert.equal(semanticShapeForCurrentEntity({ archetypeId: 'released', shape: 'bag', item: { slot: 'treasure', name: 'Recovered Evidence Bag' } }), 'bag');
  assert.equal(semanticShapeForCurrentEntity({ archetypeId: 'mystery', shape: 'unlicensed-blob', item: {} }), 'junk');
});

test('a genuine legendary pickup gets legendary visual intensity without a combo', () => {
  const visual = visualEffectForEvent({ type: 'rarePickup', tier: 'legendary', multiplier: 1 });
  assert.equal(visual.type, 'legendary');
  assert.equal(visual.intensity, 4);
});
