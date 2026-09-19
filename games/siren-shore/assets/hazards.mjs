import { HAZARD_DEFINITIONS } from './data.mjs';
import { nextId } from './state.mjs';
import { awardPoints } from './game.mjs';
import { transferPossession } from './social.mjs';

const clone = (value) => structuredClone(value);
const boundedRoll = (random) => Math.max(0, Math.min(1, Number(random()) || 0));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const event = (type, text, extra = {}) => ({ type, text, ...extra });

const HAZARD_BY_ID = new Map(HAZARD_DEFINITIONS.map((hazard) => [hazard.id, hazard]));

function clearEquippedItem(state, itemId) {
  for (const [slot, equippedId] of Object.entries(state.equipped || {})) if (equippedId === itemId) delete state.equipped[slot];
}

function releasedTreasure(state, item, hazard) {
  return {
    id: nextId(state, 'released'),
    kind: 'treasure',
    releasedBy: hazard.archetypeId,
    archetypeId: 'released',
    shape: ({ purse: 'bag', jewelry: 'gem', crown: 'crown', hair: 'hair', shoe: 'shoe', weapon: 'weapon', makeup: 'makeup', clothing: 'clothing', glove: 'glove', treasure: 'treasure' })[item.slot] || 'junk',
    chain: 'junk',
    tier: 'released',
    recoverableClaim: true,
    revealed: true,
    actionable: true,
    x: hazard.x,
    y: hazard.y,
    vx: 0,
    vy: 0,
    points: 0,
    item: { ...item, history: [...(item.history || [])] },
  };
}

function releaseCarriedItem(state, hazard, random, events) {
  const candidates = state.purseIds
    .map((id) => state.inventory.find((item) => item.id === id && item.ownerId === 'player'))
    .filter(Boolean);
  const item = candidates[Math.min(candidates.length - 1, Math.floor(boundedRoll(random) * candidates.length))];
  if (!item) {
    events.push(event('hazard', 'The jellyfish arrives prepared to rearrange your belongings, then finds your purse strategically empty.', { archetypeId: 'jellyfish' }));
    return;
  }
  const transfer = transferPossession(state, item.id, 'player', null, 'Released into the Treasure Current by a jellyfish with no respect for provenance.');
  Object.assign(state, transfer.state);
  const released = state.inventory.find(({ id }) => id === item.id);
  state.current.entities.push(releasedTreasure(state, released, hazard));
  events.push(event('hazard', `A jellyfish objects to your possession of ${released.name}.`, { archetypeId: 'jellyfish', itemId: released.id }));
  events.push(event('itemReleased', `${released.name} is floating nearby. Retrieve your evidence.`, { archetypeId: 'jellyfish', itemId: released.id }));
}

function applyElectricHair(state, hazard, _random, events) {
  state.player.effects = {
    ...(state.player.effects || {}),
    hair: 'electric',
    hairExpiresAt: (Number(state.current?.elapsed) || 0) + 45,
  };
  events.push(event('hazard', 'An electric eel edits your hair in open water.', { archetypeId: hazard.archetypeId }));
  events.push(event('lookChanged', 'ELECTRIC HAIR: temporary, charged, and impossible to ignore.', { effect: 'hair', value: 'electric' }));
}

function applyInkLook(state, hazard, _random, events) {
  state.player.effects = {
    ...(state.player.effects || {}),
    makeup: 'inked',
    makeupExpiresAt: (Number(state.current?.elapsed) || 0) + 45,
  };
  events.push(event('hazard', 'A squid has entered the chat in editorial ink.', { archetypeId: hazard.archetypeId }));
  events.push(event('lookChanged', 'INKED LOOK: temporary, theatrical, and now part of the evidence.', { effect: 'makeup', value: 'inked' }));
}

export const HAZARD_RESOLVERS = Object.freeze({
  jellyfish: releaseCarriedItem,
  eel: applyElectricHair,
  squid: applyInkLook,
});

/** Resolve a collision without death, inventory deletion, or negative points. */
export function resolveHazard(input, entityId, random = Math.random) {
  const state = clone(input);
  const hazard = state.current?.entities?.find((entity) => entity.id === entityId && entity.kind === 'hazard');
  if (!hazard) return { state, events: [event('notice', 'That aquatic allegation has already drifted away.')] };
  state.current.entities = state.current.entities.filter((entity) => entity.id !== entityId);
  const definition = HAZARD_BY_ID.get(hazard.archetypeId);
  const events = [];
  const resolver = HAZARD_RESOLVERS[hazard.archetypeId];
  if (!definition || !resolver) return { state, events: [event('notice', 'An unlicensed sea creature made a gesture and left no paperwork.')] };
  resolver(state, hazard, random, events);
  if (hazard.archetypeId === 'eel' || hazard.archetypeId === 'squid') awardPoints(state, definition.points, 'poor judgment', events);
  return { state, events };
}

function defaultSwellDue(current, random) {
  if (Number.isFinite(current.nextSwellAt) && current.nextSwellAt > 0) return current.nextSwellAt;
  return 120 + boundedRoll(random) * 120;
}

/** Schedule a warning at a 2–4 minute cadence; calling at the due time starts the warning. */
export function scheduleSwell(input, elapsed, random = Math.random) {
  const current = { ...(input || {}) };
  const now = Math.max(0, Number(elapsed) || 0);
  const events = [];
  if (current.swell) return { current, swell: current.swell, events };
  const dueAt = defaultSwellDue(current, random);
  current.nextSwellAt = dueAt;
  if (now < dueAt) return { current, swell: null, events };
  const directionAngle = boundedRoll(random) * Math.PI * 2;
  const activeSeconds = 6 + boundedRoll(random) * 4;
  const nextDue = now + 120 + boundedRoll(random) * 120;
  current.swell = {
    phase: 'warning',
    remaining: 4,
    activeSeconds,
    direction: { x: Math.cos(directionAngle), y: Math.sin(directionAngle) },
    strength: 80 + boundedRoll(random) * 80,
  };
  current.nextSwellAt = nextDue;
  events.push(event('swellWarning', 'SWELL WARNING: the water is gathering an opinion.', { phase: 'warning', direction: current.swell.direction }));
  return { current, swell: current.swell, events };
}

/** Advance a single warning/active swell. A completed swell is represented by null. */
export function stepSwell(input, dt) {
  if (!input) return null;
  const swell = clone(input);
  const seconds = Math.max(0, Number(dt) || 0);
  const remaining = (Number.isFinite(swell.remaining) ? swell.remaining : swell.phase === 'warning' ? 4 : swell.activeSeconds || 6) - seconds;
  if (remaining > 0) return { ...swell, remaining };
  if (swell.phase === 'warning') {
    const activeRemaining = (Number(swell.activeSeconds) || 6) + remaining;
    return activeRemaining > 0 ? { ...swell, phase: 'active', remaining: activeRemaining } : null;
  }
  return null;
}

/** Return a bounded directional velocity for an active swell at a point in its viewport. */
export function swellForce(swell, point = {}) {
  if (!swell || swell.phase !== 'active') return { x: 0, y: 0 };
  const strength = clamp(Number(swell.strength) || 0, 0, 180);
  let x = Math.abs(Number(swell.direction?.x) || 0) < 1e-8 ? 0 : (Number(swell.direction?.x) || 0) * strength;
  let y = Math.abs(Number(swell.direction?.y) || 0) < 1e-8 ? 0 : (Number(swell.direction?.y) || 0) * strength;
  if (Number.isFinite(point.minX) && Number.isFinite(point.x) && ((point.x <= point.minX && x < 0) || (point.x >= point.maxX && x > 0))) x = 0;
  if (Number.isFinite(point.minY) && Number.isFinite(point.y) && ((point.y <= point.minY && y < 0) || (point.y >= point.maxY && y > 0))) y = 0;
  return { x, y };
}

function activeHazardIds(state) {
  const zone = state.world?.zones?.find(({ index }) => index === state.world?.zoneIndex);
  const ids = zone?.hazards?.filter((id) => HAZARD_BY_ID.has(id));
  return ids?.length ? ids : ['jellyfish'];
}

export function spawnHazardEntity(state, random = Math.random, viewport = { width: 390, height: 844 }) {
  const ids = activeHazardIds(state);
  const archetypeId = ids[Math.min(ids.length - 1, Math.floor(boundedRoll(random) * ids.length))];
  const definition = HAZARD_BY_ID.get(archetypeId) || HAZARD_DEFINITIONS[0];
  const width = Math.max(72, Number(viewport.width) || 390);
  const cameraX = Number.isFinite(viewport.cameraX) ? viewport.cameraX : 0;
  const cameraY = Number.isFinite(viewport.cameraY) ? viewport.cameraY : 0;
  return {
    id: nextId(state, 'hazard'),
    kind: 'hazard',
    archetypeId: definition.id,
    shape: definition.shape,
    x: cameraX + 44 + boundedRoll(random) * (width - 88),
    y: cameraY - 36 - boundedRoll(random) * 80,
    vx: (boundedRoll(random) - .5) * 28,
    vy: 38 + boundedRoll(random) * 40,
    actionable: false,
  };
}
