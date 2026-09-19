import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMotionState,
  ensureActiveZones,
  nearestActionable,
  stepMotion,
} from '../games/siren-shore/assets/world.mjs';
import { ZONE_DEFINITIONS } from '../games/siren-shore/assets/data.mjs';
import { isWorldActionAllowed, sheetTriggerForOpen, shouldHandleActionKey } from '../games/siren-shore/assets/app.mjs';

test('movement accelerates, glides, and decelerates inside bounds', () => {
  let motion = createMotionState({ x: 100, y: 100 });
  motion = stepMotion(motion, { x: 1, y: 0 }, 0.1, { width: 390, height: 844 });
  assert.ok(motion.vx > 0);
  const released = stepMotion(motion, { x: 0, y: 0 }, 0.1, { width: 390, height: 844 });
  assert.ok(released.x > motion.x);
  assert.ok(released.vx < motion.vx);
});

test('movement remains in its phone-safe bounds and banks with horizontal velocity', () => {
  const motion = stepMotion({ x: 36, y: 72, vx: 0, vy: 0, banking: 0 }, { x: -1, y: -1 }, 1, { width: 390, height: 844 });
  assert.equal(motion.x, 36);
  assert.equal(motion.y, 72);
  assert.ok(motion.banking < 0);
});

test('world streaming keeps previous, current, and next zones only', () => {
  const world = ensureActiveZones({ seed: 7, zoneIndex: 4, zones: [], history: [] }, () => 0.25);
  assert.deepEqual(world.zones.map(({ index }) => index), [3, 4, 5]);
});

test('world streaming retires meaningful zone history and replaces invalid generated records', () => {
  const world = ensureActiveZones({
    seed: 7,
    zoneIndex: 4,
    zones: [{ index: 1, definition: null, incidents: [{ text: 'A major glare.' }], possessions: [{ name: 'The Regal Fork' }] }],
    history: [],
  }, () => 0.25);
  assert.equal(world.history.length, 1);
  assert.equal(world.history[0].index, 1);
  assert.deepEqual(world.history[0].incidents, ['A major glare.']);
  assert.deepEqual(world.history[0].possessions, ['The Regal Fork']);
  assert.ok(world.zones.every(({ definition }) => definition?.id));
});

test('world streaming retains active zone state until it is retired', () => {
  let world = ensureActiveZones({ seed: 7, zoneIndex: 4, zones: [], history: [] }, () => 0.25);
  const zoneFour = world.zones.find(({ index }) => index === 4);
  zoneFour.incidents = [{ text: 'Cynthia saw everything.' }];
  zoneFour.possessions = [{ name: 'The Evidence Clutch' }];

  world = ensureActiveZones({ ...world, zoneIndex: 5 }, () => 0.25);
  assert.deepEqual(world.zones.find(({ index }) => index === 4).incidents, [{ text: 'Cynthia saw everything.' }]);
  world = ensureActiveZones({ ...world, zoneIndex: 6 }, () => 0.25);

  assert.deepEqual(world.history.find(({ index }) => index === 4), {
    index: 4,
    name: zoneFour.name,
    incidents: ['Cynthia saw everything.'],
    possessions: ['The Evidence Clutch'],
  });
});

test('world streaming replaces a malformed active definition with the catalog fallback', () => {
  const world = ensureActiveZones({
    seed: 7,
    zoneIndex: 4,
    zones: [{ index: 4, definition: { id: 'broken', palette: null, hazards: null } }],
    history: [],
  }, () => 0.25);
  const zone = world.zones.find(({ index }) => index === 4);
  assert.equal(zone.definition, ZONE_DEFINITIONS[0]);
  assert.deepEqual(zone.palette, ZONE_DEFINITIONS[0].palette);
  assert.deepEqual(zone.hazards, ZONE_DEFINITIONS[0].hazards);
});

test('nearest actionable favors the closest uncollected entity or NPC in range', () => {
  const nearby = nearestActionable(
    { x: 100, y: 100 },
    [{ id: 'claimed', x: 102, y: 100, collected: true }, { id: 'treasure', x: 130, y: 100 }],
    [{ id: 'mermaid', x: 112, y: 100 }],
    40,
  );
  assert.equal(nearby.id, 'mermaid');
  assert.equal(nearestActionable({ x: 0, y: 0 }, [], [{ id: 'far', x: 90, y: 0 }], 40), null);
});

test('Space fires one world action and suppresses key repeat', () => {
  assert.equal(shouldHandleActionKey({ key: ' ', repeat: false, target: { tagName: 'BODY' } }, false), true);
  assert.equal(shouldHandleActionKey({ key: ' ', repeat: true, target: { tagName: 'BODY' } }, false), false);
});

test('Space does not trigger the ocean behind a dialog or form control', () => {
  assert.equal(isWorldActionAllowed({ tagName: 'SELECT' }, true), false);
  assert.equal(isWorldActionAllowed({ tagName: 'BODY' }, true), false);
  assert.equal(isWorldActionAllowed({ tagName: 'BODY' }, false), true);
});

test('contextual action keys include Space aliases and prevent scrolling only when handled', () => {
  let prevented = 0;
  assert.equal(shouldHandleActionKey({ key: 'Spacebar', repeat: false, target: { tagName: 'BODY' }, preventDefault: () => { prevented += 1; } }, false), true);
  assert.equal(shouldHandleActionKey({ key: 'Enter', repeat: false, target: { tagName: 'BUTTON' }, preventDefault: () => { prevented += 1; } }, false), false);
  assert.equal(prevented, 1);
});

test('a nested sheet keeps the original visible trigger for a sane return focus', () => {
  const more = { id: 'more' };
  const cabinet = { id: 'cabinet' };
  assert.equal(sheetTriggerForOpen({ sheetWasOpen: false, lastSheetTrigger: null, trigger: more }), more);
  assert.equal(sheetTriggerForOpen({ sheetWasOpen: true, lastSheetTrigger: more, trigger: cabinet }), more);
});
