import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceForState } from '../games/siren-shore/assets/render.mjs';
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
