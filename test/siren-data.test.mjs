import test from 'node:test';
import assert from 'node:assert/strict';
import { generateItem, generateShore, NPC_DEFINITIONS } from '../games/siren-shore/assets/data.mjs';

function cyclingRandom() {
  let n = 0;
  return () => ((n++ * 73) % 997) / 997;
}

test('item generation remains combinatorial and valid', () => {
  const random = cyclingRandom();
  const items = Array.from({ length: 2000 }, (_, index) =>
    generateItem(random, { id: `item-${index}`, ownerId: 'player', shoreName: 'The Tax-Deductible Trench' }),
  );
  for (const item of items) {
    assert.ok(item.id && item.name && item.description && item.category && item.slot && item.rarity);
    assert.ok(Array.isArray(item.colors) && item.colors.length >= 2);
    assert.ok(item.origin.includes('Tax-Deductible Trench'));
    assert.ok(Array.isArray(item.history));
  }
  assert.ok(new Set(items.map(({ name }) => name)).size >= 500);
});

test('shore generation scales flavor without requiring a final shore', () => {
  const random = cyclingRandom();
  const early = generateShore(random, 1);
  const absurd = generateShore(random, 100000);
  assert.ok(early.name && absurd.name);
  assert.equal(early.findCount >= 8, true);
  assert.equal(Number.isFinite(absurd.findCount), true);
  assert.equal(absurd.level, 100000);
});

test('persistent cast contains distinct dramatic mermaids', () => {
  assert.ok(NPC_DEFINITIONS.length >= 8);
  assert.equal(new Set(NPC_DEFINITIONS.map(({ id }) => id)).size, NPC_DEFINITIONS.length);
  assert.equal(NPC_DEFINITIONS.every(({ name, signatureRead, palette }) => name && signatureRead && palette.length >= 3), true);
});
