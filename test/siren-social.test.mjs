import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import { collectCurrentEntity, stepCurrent } from '../games/siren-shore/assets/current.mjs';
import { advanceSocialClock, attemptNpcTheft, chooseNpcTarget, nextPursuit, reconcilePursuitForOuting, recordIncident, relationshipKey, resolveContestedPickup, resolvePursuit, stepNpcPursuit, transferPossession } from '../games/siren-shore/assets/social.mjs';

function socialFixture() {
  const state = createDefaultState(() => 0.5);
  state.mode = 'ocean';
  state.current.entities = [{
    id: 'crown-entity', kind: 'treasure', archetypeId: 'crown', shape: 'crown',
    item: { id: 'crown-item', name: 'Disputed Crown', slot: 'crown', ownerId: null, history: [] },
    points: 388000, x: 180, y: 100, actionable: true,
  }];
  const packed = { id: 'packed-1', name: 'Pearl Liability', slot: 'jewelry', ownerId: 'player', history: [] };
  state.inventory.push(packed);
  state.purseIds.push(packed.id);
  return state;
}

test('NPC targets preferred treasure before lower-value unrelated treasure', () => {
  const npc = { id: 'cynthia', preference: 'crown', x: 100, y: 100 };
  const target = chooseNpcTarget(npc, [
    { id: 'coin', archetypeId: 'coin', x: 110, y: 100, points: 4006 },
    { id: 'crown', archetypeId: 'crown', x: 180, y: 100, points: 388000 },
  ], socialFixture());
  assert.equal(target.id, 'crown');
});

test('rivalry changes target selection only when the player is visibly claiming a Current item', () => {
  const state = socialFixture();
  const npc = { id: 'cynthia', preference: 'nothing', x: 100, y: 100 };
  const entities = [
    { id: 'expensive', archetypeId: 'coin', x: 160, y: 100, points: 12000 },
    { id: 'claimed', archetypeId: 'junk', x: 160, y: 100, points: 4000 },
  ];
  assert.equal(chooseNpcTarget(npc, entities, state).id, 'expensive');
  state.current.targetId = 'claimed';
  state.npcs.cynthia.rivalry = 2;
  assert.equal(chooseNpcTarget(npc, entities, state).id, 'claimed');
});

test('NPC collection persists the object in her inventory', () => {
  const result = resolveContestedPickup(socialFixture(), 'cynthia', 'crown-entity', () => 0);
  const crown = result.state.inventory.find(({ id }) => id === result.events[0].itemId);
  assert.equal(crown.ownerId, 'cynthia');
  assert.ok(result.state.npcs.cynthia.possessions.includes(crown.id));
  assert.equal(result.state.current.entities.length, 0);
  assert.equal(result.state.npcs.cynthia.rivalry, 1);
  assert.equal(result.state.npcs.cynthia.memories.at(-1).itemId, crown.id);
});

test('a distant player is not treated as a contest winner or given the NPC pickup', () => {
  const state = socialFixture();
  state.player.x = 900;
  state.player.y = 700;
  state.npcs.cynthia.x = 180;
  state.npcs.cynthia.y = 100;
  const result = resolveContestedPickup(state, 'cynthia', 'crown-entity', () => .99);
  assert.equal(result.winner, 'cynthia');
  assert.equal(result.contested, false);
  assert.equal(result.state.inventory.find(({ id }) => id === 'crown-item').ownerId, 'cynthia');
  assert.equal(result.state.progression.points, 0);
  assert.deepEqual(result.state.current.combo, state.current.combo);
});

test('a real contest pushes both mermaids without crossing the local viewport bounds', () => {
  const state = socialFixture();
  state.current.entities[0].x = 180;
  state.current.entities[0].y = 190;
  state.player.x = 195;
  state.player.y = 190;
  state.npcs.cynthia.x = 182;
  state.npcs.cynthia.y = 191;
  state.social.contestBounds = { minX: 160, maxX: 220, minY: 150, maxY: 230 };
  const result = resolveContestedPickup(state, 'cynthia', 'crown-entity', () => 0);
  assert.equal(result.contested, true);
  assert.notEqual(result.state.player.x, state.player.x);
  assert.notEqual(result.state.npcs.cynthia.x, state.npcs.cynthia.x);
  assert.ok(result.state.player.x >= 160 && result.state.player.x <= 220);
  assert.ok(result.state.npcs.cynthia.x >= 160 && result.state.npcs.cynthia.x <= 220);
  assert.ok(Math.hypot(result.impact.player.vx, result.impact.player.vy) > 0);
  assert.ok(result.events.some(({ type }) => type === 'contest'));
  assert.equal(result.events.filter(({ type }) => type === 'contest').length, 1);
  assert.equal(result.events.filter(({ type }) => type === 'contestImpact').length, 1);
  assert.equal(result.events.find(({ type }) => type === 'contest').incidentId, result.events.find(({ type }) => type === 'contestImpact').incidentId);
});

test('a player-won Treasure Current contest creates exactly one social incident and durable NPC reaction', () => {
  const state = socialFixture();
  state.player.x = 195;state.player.y = 190;
  state.npcs.cynthia.x = 182;state.npcs.cynthia.y = 191;
  state.current.entities[0].x = 180;state.current.entities[0].y = 190;
  const result = resolveContestedPickup(state, 'cynthia', 'crown-entity', () => .99);
  assert.equal(result.winner, 'player');
  assert.equal(result.state.social.incidents.length, 1);
  assert.equal(result.state.social.rumors.length, 1);
  assert.ok(result.state.social.relationships[relationshipKey('cynthia', 'player')].rivalry > 0);
  assert.ok(result.state.npcs.cynthia.memories.some(({ type }) => type === 'incident'));
  assert.equal(result.events.filter(({ type }) => type === 'contest').length, 1);
  assert.equal(result.events.filter(({ type }) => type === 'contestImpact').length, 1);
  assert.equal(result.events.find(({ type }) => type === 'contest').incidentId, result.events.find(({ type }) => type === 'contestImpact').incidentId);
});

test('a purse-full player contest is socially final once but leaves the treasure collectible later', () => {
  const state = socialFixture();
  state.player.purse = 'clam';
  for (let index = 2; index <= 3; index += 1) {
    state.inventory.push({ id: `packed-${index}`, name: `Packed Situation ${index}`, slot: 'treasure', ownerId: 'player', history: [] });
    state.purseIds.push(`packed-${index}`);
  }
  state.player.x = 195;state.player.y = 190;
  state.npcs.cynthia.x = 182;state.npcs.cynthia.y = 191;
  state.current.entities[0].x = 180;state.current.entities[0].y = 190;
  const first = resolveContestedPickup(state, 'cynthia', 'crown-entity', () => .99);
  const repeated = resolveContestedPickup(first.state, 'cynthia', 'crown-entity', () => .99);
  assert.equal(first.state.social.incidents.length, 1);
  assert.equal(first.state.social.rumors.length, 1);
  assert.equal(repeated.state.social.incidents.length, 1);
  assert.equal(repeated.state.social.rumors.length, 1);
  assert.equal(repeated.events.filter(({ type }) => type === 'contest').length, 0);
  assert.ok(repeated.state.current.entities.some(({ id }) => id === 'crown-entity'));
  repeated.state.purseIds = [];
  const collected = collectCurrentEntity(repeated.state, 'crown-entity');
  assert.ok(collected.events.some(({ type }) => type === 'pickup' || type === 'rarePickup'));
  assert.equal(collected.state.current.entities.some(({ id }) => id === 'crown-entity'), false);
  assert.equal(collected.state.progression.points, 388000);
});

test('a purse-full claim survives a falling Current and is collectable exactly once later', () => {
  const state = socialFixture();
  state.player.purse = 'clam';
  for (let index = 2; index <= 3; index += 1) {
    state.inventory.push({ id: `full-${index}`, name: `Full Purse ${index}`, slot: 'treasure', ownerId: 'player', history: [] });
    state.purseIds.push(`full-${index}`);
  }
  state.player.x = 195;state.player.y = 190;
  state.npcs.cynthia.x = 182;state.npcs.cynthia.y = 191;
  state.current.entities[0].x = 180;state.current.entities[0].y = 190;state.current.entities[0].vy = 600;
  const won = resolveContestedPickup(state, 'cynthia', 'crown-entity', () => .99);
  const advanced = stepCurrent(won.state, 10, { width: 390, height: 844, cameraX: 0, cameraY: 0 }, () => .5);
  const claim = advanced.state.current.entities.find(({ id }) => id === 'crown-entity');
  assert.ok(claim, 'the claimed treasure must not retire offscreen');
  assert.equal(claim.actionable, true);
  assert.equal(advanced.state.social.incidents.length, 1);
  advanced.state.purseIds = [];
  const collected = collectCurrentEntity(advanced.state, 'crown-entity');
  assert.equal(collected.state.current.entities.some(({ id }) => id === 'crown-entity'), false);
  assert.equal(collected.state.inventory.filter(({ id }) => id === 'crown-item').length, 1);
  assert.equal(collected.state.inventory.find(({ id }) => id === 'crown-item').ownerId, 'player');
  assert.equal(collected.state.progression.points, 388000);
  assert.equal(collectCurrentEntity(collected.state, 'crown-entity').events[0].type, 'notice');
});

test('NPC theft and player recovery preserve one object and append history', () => {
  const stolen = attemptNpcTheft(socialFixture(), 'cynthia', () => 0);
  const recovered = transferPossession(stolen.state, stolen.events[0].itemId, 'cynthia', 'player', 'Recovered publicly.');
  assert.equal(recovered.state.inventory.filter(({ id }) => id === stolen.events[0].itemId).length, 1);
  assert.equal(recovered.state.inventory.find(({ id }) => id === stolen.events[0].itemId).history.length, 2);
  assert.equal(recovered.state.purseIds.filter((id) => id === stolen.events[0].itemId).length, 1);
  assert.equal(recovered.state.npcs.cynthia.possessions.includes(stolen.events[0].itemId), false);
});

test('transfer authority removes stale duplicate ownership and only appends provenance', () => {
  const state = socialFixture();
  state.npcs.cynthia.possessions.push('packed-1');
  state.inventory.push({ ...state.inventory[0], history: ['stale duplicate'] });
  const result = transferPossession(state, 'packed-1', 'player', 'marina', 'Publicly reassigned.');
  const item = result.state.inventory.find(({ id }) => id === 'packed-1');
  assert.equal(result.state.inventory.filter(({ id }) => id === 'packed-1').length, 1);
  assert.equal(item.ownerId, 'marina');
  assert.deepEqual(result.state.purseIds.filter((id) => id === item.id), []);
  assert.deepEqual(result.state.npcs.cynthia.possessions.filter((id) => id === item.id), []);
  assert.ok(result.state.npcs.marina.possessions.includes(item.id));
  assert.equal(item.history.at(-1), 'Publicly reassigned.');
});

test('pursuit has glide, target intent, and safely clears a missing target', () => {
  const target = { id: 'crown', x: 160, y: 100 };
  const first = stepNpcPursuit({ npcId: 'cynthia', x: 100, y: 100, vx: 0, vy: 0, frustration: 0 }, target, .1);
  assert.equal(first.targetId, 'crown');
  assert.equal(first.mode, 'pursue');
  assert.ok(first.vx > 0);
  const idle = stepNpcPursuit(first, null, .1);
  assert.equal(idle.targetId, null);
  assert.equal(idle.mode, 'drift');
  assert.ok(idle.frustration > first.frustration);
});

function heatedState(actorId, targetId, heat) {
  const state = createDefaultState(() => 0.5);
  state.social.relationships[relationshipKey(actorId, targetId)] = {
    affinity: 0, rivalry: heat, heat, alliance: false, lastIncidentId: 'incident-1',
  };
  return state;
}

test('relationships are directional and persist between NPCs', () => {
  const state = createDefaultState(() => 0.4);
  const result = recordIncident(state, {
    type: 'theft', actorId: 'cynthia', targetId: 'marina', witnesses: ['beatrice'],
    itemId: 'crown-1', public: true,
  });
  assert.ok(result.state.social.relationships[relationshipKey('marina', 'cynthia')].rivalry > 0);
  assert.ok(result.state.social.relationships[relationshipKey('cynthia', 'marina')]);
  assert.ok(result.state.social.rumors.length > 0);
  assert.ok(result.events.some(({ type }) => type === 'publicReaction'));
});

test('social clock can create a scene without player initiation', () => {
  const result = advanceSocialClock(createDefaultState(() => 0.2), 180, () => 0);
  assert.ok(result.events.some(({ type }) => ['gossip', 'confrontation', 'alliance'].includes(type)));
  assert.ok(result.state.social.incidents.length > 0);
  const scene = result.state.social.incidents[0];
  assert.ok(scene.actorId && scene.targetId && Array.isArray(scene.witnesses));
  assert.ok(Object.hasOwn(scene, 'visibility') && Object.hasOwn(scene, 'deltas'));
});

test('one autonomous gossip scene emits one gossip identity and one public reaction', () => {
  const result = advanceSocialClock(createDefaultState(() => .2), 180, () => 0);
  const gossip = result.events.filter(({ type }) => type === 'gossip');
  const reactions = result.events.filter(({ type }) => type === 'publicReaction');
  assert.equal(gossip.length, 1);
  assert.equal(reactions.length, 1);
  assert.equal(gossip[0].incidentId, reactions[0].incidentId);
});

test('high relational heat schedules a recognizable later pursuit', () => {
  const state = heatedState('cynthia', 'player', 8);
  const result = nextPursuit(state, 3);
  assert.equal(result.npcId, 'cynthia');
  assert.equal(result.reason.targetId, 'player');
  assert.ok(['below', 'left', 'right'].includes(result.entry));
});

test('social history retires old incidents into durable NPC memories and caps rumors', () => {
  let state = createDefaultState(() => .1);
  for (let index = 0; index < 84; index += 1) {
    state = recordIncident(state, { type: 'confrontation', actorId: 'marina', targetId: 'cynthia', witnesses: ['beatrice'], public: true }).state;
  }
  assert.equal(state.social.incidents.length, 80);
  assert.ok(state.npcs.marina.memories.some(({ type }) => type === 'retiredIncident'));
  assert.ok(state.npcs.cynthia.memories.some(({ type }) => type === 'retiredIncident'));
  assert.ok(state.social.rumors.length <= 40);
});

test('irregular social scenes are deterministic with injected randomness', () => {
  const randomValues = [.1, .7, .3, .8, .4, .2, .9, .5];
  const makeRandom = () => { let index = 0; return () => randomValues[index++ % randomValues.length]; };
  const a = advanceSocialClock(createDefaultState(() => .5), 460, makeRandom());
  const b = advanceSocialClock(createDefaultState(() => .5), 460, makeRandom());
  assert.deepEqual(a.state.social.incidents, b.state.social.incidents);
  assert.ok(a.state.social.clock.nextSceneAt - a.state.social.clock.elapsed >= 60);
  assert.ok(a.state.social.clock.nextSceneAt - a.state.social.clock.elapsed <= 180);
});

test('engaging or swimming away from a pursuit updates the pursuing mermaid memory without damage', () => {
  const pursuit = nextPursuit(heatedState('cynthia', 'player', 8), 1);
  const engaged = resolvePursuit(heatedState('cynthia', 'player', 8), pursuit, 'engage');
  const avoided = resolvePursuit(heatedState('cynthia', 'player', 8), pursuit, 'swimAway');
  assert.equal(engaged.state.npcs.cynthia.memories.at(-1).type, 'pursuitEngaged');
  assert.equal(avoided.state.npcs.cynthia.memories.at(-1).type, 'pursuitAvoided');
  assert.equal(engaged.state.player.health, undefined);
  assert.equal(avoided.state.player.health, undefined);
});

test('an outing boundary clears an unresolved pursuit, preserves the choice, and permits a later pursuit', () => {
  const state = heatedState('cynthia', 'player', 8);
  const pursuit = nextPursuit(state, 1);
  const result = reconcilePursuitForOuting(state, pursuit, 'swimAway');
  assert.deepEqual(result.state.social.pursuits, []);
  assert.equal(result.state.npcs.cynthia.memories.at(-1).type, 'pursuitAvoided');
  result.state.social.clock.elapsed = 999;
  assert.equal(nextPursuit(result.state, 2).npcId, 'cynthia');
});
