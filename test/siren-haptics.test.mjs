import test from 'node:test';
import assert from 'node:assert/strict';
import { createHapticsController } from '../games/siren-shore/assets/haptics.mjs';

test('haptics are optional and unsupported devices remain playable', () => {
  const calls = [];
  const active = createHapticsController({ vibrate: (pattern) => calls.push(pattern), enabled: true });
  active.consumeEvent({ type: 'rarePickup' });
  assert.deepEqual(calls[0], [18, 24, 34]);
  assert.doesNotThrow(() => createHapticsController({ vibrate: null, enabled: true }).consumeEvent({ type: 'pickup' }));
});

test('haptics remain silent before interaction and when disabled or denied', () => {
  const calls = [];
  const controller = createHapticsController({ vibrate: (pattern) => calls.push(pattern), enabled: true, interacted: false });
  controller.consumeEvent({ type: 'pickup' });
  assert.deepEqual(calls, []);
  controller.activate();
  controller.setEnabled(false);
  controller.consumeEvent({ type: 'theft' });
  assert.deepEqual(calls, []);
  assert.doesNotThrow(() => createHapticsController({ vibrate() { throw new Error('denied'); }, enabled: true }).consumeEvent({ type: 'legendary' }));
});

test('haptics normalize the game event names for theft, recovery, and legendary finds', () => {
  const calls = [];
  const controller = createHapticsController({ vibrate: (pattern) => calls.push(pattern), enabled: true });
  controller.consumeEvent({ type: 'npcTheft' });
  controller.consumeEvent({ type: 'pickup', recovery: true });
  controller.consumeEvent({ type: 'rarePickup', tier: 'legendary' });
  assert.deepEqual(calls, [[28, 18, 12], [12, 18, 28], [26, 30, 46]]);
});

test('a recovered rare pickup restores the recovery haptic before rarity fanfare', () => {
  const calls = [];
  const controller = createHapticsController({ vibrate: (pattern) => calls.push(pattern), enabled: true });
  controller.consumeEvent({ type: 'rarePickup', recovery: true, tier: 'legendary' });
  assert.deepEqual(calls, [[12, 18, 28]]);
});
