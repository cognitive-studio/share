import { ITEM_ARCHETYPES, generateItem } from './data.mjs';
import { acquireCurrentItem, resolveCombination } from './game.mjs';
import { nextId } from './state.mjs';
import { scheduleSwell, spawnHazardEntity, stepSwell, swellForce } from './hazards.mjs';

const clone = (value) => structuredClone(value);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const boundedRoll = (random) => Math.max(0, Math.min(1, Number(random()) || 0));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function currentEvent(type, text, extra = {}) {
  return { type, text, ...extra };
}

const isRecoveryClaim = entity => Boolean(entity?.recoverableClaim || entity?.releasedBy || entity?.contestResolvedBy === 'player');
function boundCurrent(current) {
  const claims=(current.entities || []).filter(isRecoveryClaim);
  const ambient=(current.entities || []).filter(entity=>!isRecoveryClaim(entity)).slice(-64);
  let queue=Array.isArray(current.recoveryClaims)?current.recoveryClaims:[];
  if(claims.length>8)queue=[...queue,...claims.slice(8)];
  const active=claims.slice(0,8);
  if(active.length<8&&queue.length){const count=8-active.length;active.push(...queue.slice(0,count));queue=queue.slice(count);}
  current.recoveryClaims=queue;
  current.entities=[...active,...ambient];
}

function pickArchetype(random) {
  const total = ITEM_ARCHETYPES.reduce((sum, archetype) => sum + archetype.weight, 0);
  let remainder = boundedRoll(random) * total;
  for (const archetype of ITEM_ARCHETYPES) {
    remainder -= archetype.weight;
    if (remainder < 0) return archetype;
  }
  return ITEM_ARCHETYPES.at(-1);
}

function currentShoreName(state) {
  const zone=state.world?.zones?.find(zone=>zone.index===state.world.zoneIndex);
  return `${zone?.name || state.shore?.name || 'the unnamed shoal'} Treasure Current`;
}

const ITEM_IDENTITIES = Object.freeze({
  coin: 'Municipal Gold Coin',
  pearl: 'Unlicensed Pearl',
  jewel: 'Disputed Jewel',
  crown: 'Public Crown',
  bag: 'Evidence Bag',
  junk: 'Human Junk',
});

export const COMBO_LABELS = Object.freeze({
  gold: ['GILDED', 'LIQUID ASSETS', 'UNEXPLAINED WEALTH'],
  pearl: ['STRING OF LIES', 'CLUTCHED PEARLS', 'OYSTER LIABILITY'],
  jewelry: ['OVERACCESSORIZED', 'ESTATE PROBLEM', 'REGULATED LUXURY EVENT'],
  junk: ['FOUND OBJECT', 'CURATED DEBRIS', 'MUNICIPAL COLLECTION'],
  couture: ['DRESSED FOR COURT', 'TEXTILE INCIDENT', 'UNSUPERVISED GLAMOUR'],
});

const COMBO_MULTIPLIERS = Object.freeze([
  { count: 10, multiplier: 4 },
  { count: 6, multiplier: 3 },
  { count: 3, multiplier: 2 },
]);

function normalizedCombo(combo = {}) {
  return {
    chain: typeof combo.chain === 'string' && combo.chain ? combo.chain : null,
    count: Math.max(0, Math.floor(Number(combo.count) || 0)),
    multiplier: Math.max(1, Math.floor(Number(combo.multiplier) || 1)),
  };
}

function multiplierForCount(count) {
  return COMBO_MULTIPLIERS.find((threshold) => count >= threshold.count)?.multiplier || 1;
}

export function combinationLabel(combo) {
  const labels = COMBO_LABELS[combo?.chain] || ['TREASURE THEORY', 'PUBLIC DISPLAY', 'OCEANIC EVENT'];
  return labels[Math.min(labels.length - 1, Math.max(0, (Number(combo?.multiplier) || 1) - 1))];
}

export function advanceCombination(combo, entity) {
  const prior = normalizedCombo(combo);
  const chain = typeof entity?.chain === 'string' && entity.chain ? entity.chain : 'treasure';
  if (prior.chain && prior.chain !== chain) {
    return {
      resolved: prior,
      combo: { chain, count: 1, multiplier: 1 },
    };
  }
  const count = prior.chain === chain ? prior.count + 1 : 1;
  return { combo: { chain, count, multiplier: multiplierForCount(count) } };
}

export function rushPhaseAt(input, elapsed, random = Math.random) {
  const current = { ...(input || {}) };
  const now = Math.max(0, Number(elapsed) || 0);
  const events = [];
  if (current.rush === 'rush' && now >= (Number(current.rushEndsAt) || 0)) {
    const finds = Math.max(0, Math.floor(Number(current.rushFinds) || 0));
    const points = Math.max(0, Math.floor(Number(current.rushPoints) || 0));
    current.rush = 'drift';
    current.rushEndsAt = 0;
    current.nextRushAt = now + 45 + boundedRoll(random) * 45;
    events.push(currentEvent('rushSummary', `Treasure Rush resolved: ${finds} finds and ${points.toLocaleString()} Siren Points secured.`, { finds, points }));
    return { current, events };
  }
  if (current.rush !== 'rush') {
    const nextRushAt = Number(current.nextRushAt) > 0 ? current.nextRushAt : 45 + boundedRoll(random) * 45;
    current.nextRushAt = nextRushAt;
    if (now >= nextRushAt) {
      current.rush = 'rush';
      current.rushEndsAt = now + 15 + boundedRoll(random) * 10;
      current.rushFinds = 0;
      current.rushPoints = 0;
      events.push(currentEvent('rushStart', 'TREASURE RUSH: the current has become financially expressive.', { endsAt: current.rushEndsAt }));
    }
  }
  return { current, events };
}

function currentItem(state, archetype, random) {
  const item = generateItem(random, { id: nextId(state, 'item'), shoreName: currentShoreName(state) });
  const identity = ITEM_IDENTITIES[archetype.id] || archetype.id;
  item.name = identity;
  item.description = `A ${identity.toLowerCase()} falling through the Treasure Current. Its silhouette has no intention of misleading anyone.`;
  item.slot = archetype.slot;
  item.category = archetype.slot === 'treasure' ? 'Find' : 'Adornment';
  return item;
}

export function spawnTier(roll) {
  if (roll < 0.80) return 'ambient';
  if (roll < 0.95) return 'concealed';
  return 'legendary';
}

export function spawnCurrentEntity(state, random = Math.random, viewport = { width: 390, height: 844 }) {
  const archetype = pickArchetype(random);
  const tier = spawnTier(boundedRoll(random));
  const width = Math.max(72, Number(viewport.width) || 390);
  const cameraX = Number.isFinite(viewport.cameraX) ? viewport.cameraX : 0;
  const cameraY = Number.isFinite(viewport.cameraY) ? viewport.cameraY : 0;
  const item = currentItem(state, archetype, random);
  return {
    id: nextId(state, 'current'),
    kind: 'treasure',
    archetypeId: archetype.id,
    shape: archetype.shape,
    chain: archetype.chain,
    tier,
    revealed: tier !== 'concealed',
    x: cameraX + 36 + boundedRoll(random) * (width - 72),
    y: cameraY - 32 - boundedRoll(random) * 52,
    vx: (boundedRoll(random) - .5) * 44,
    vy: 76 + boundedRoll(random) * 112,
    points: archetype.points,
    actionable: tier !== 'concealed',
    item,
  };
}

export function selectCurrentTarget(player, entities = [], radius = 120) {
  return entities
    .filter((entity) => entity?.actionable && !entity.collected && entity.revealed !== false)
    .map((entity) => ({ ...entity, distance: distance(player, entity) }))
    .filter((entity) => Number.isFinite(entity.distance) && entity.distance <= radius)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

export function stepCurrent(input, dt, viewport, random = Math.random) {
  // Frame clocks copy only bounded runtime branches. Durable collections are
  // shared until an ownership/social transaction actually changes them.
  const state = { ...input, counters: { ...input.counters }, player: { ...input.player, effects: { ...input.player?.effects } } };
  const current = { ...(state.current || { entities: [], elapsed: 0, rush: 'drift' }) };
  boundCurrent(current);
  const elapsed = Math.max(0, Number(current.elapsed) || 0);
  const seconds = Math.max(0, Number(dt) || 0);
  const width = Math.max(1, Number(viewport?.width) || 390);
  const cameraX = Number.isFinite(viewport?.cameraX) ? viewport.cameraX : 0;
  const height = Math.max(1, Number(viewport?.height) || 844);
  const cameraY = Number.isFinite(viewport?.cameraY) ? viewport.cameraY : 0;
  const events = [];
  const moved = (current.entities || []).map((entity) => {
    if ((entity?.recoverableClaim || entity?.releasedBy || entity?.contestResolvedBy === 'player') && !entity?.collected) {
      return {
        ...entity, recoverableClaim: true, claimStatus: entity.contestResolvedBy === 'player' ? 'secured' : 'released', vx: 0, vy: 0,
        x: clamp((Number(state.player?.x) || cameraX + width / 2) + 62, cameraX + 40, cameraX + width - 40),
        y: clamp((Number(state.player?.y) || cameraY + height / 2) - 48, cameraY + 92, cameraY + height - 132),
      };
    }
    const force = swellForce(current.swell, { ...entity, minX: cameraX + 24, maxX: cameraX + width - 24 });
    return {
      ...entity,
      x: entity.x + (Number(entity.vx) || 0) * seconds + force.x * seconds,
      y: entity.y + ((Number(entity.vy) || 0) + force.y) * seconds,
    };
  });
  current.elapsed = elapsed + seconds;
  const scheduledSwell = scheduleSwell(current, current.elapsed, random);
  Object.assign(current, scheduledSwell.current);
  events.push(...scheduledSwell.events);
  const priorSwell = current.swell;
  current.swell = stepSwell(current.swell, seconds);
  if (priorSwell?.phase === 'warning' && current.swell?.phase === 'active') {
    events.push(currentEvent('swellStart', 'THE SWELL ARRIVES: maintain your silhouette.', { direction: current.swell.direction }));
    events.push(currentEvent('swellImpact', 'The water makes a very public adjustment.', { direction: current.swell.direction }));
  } else if (priorSwell && !current.swell) {
    events.push(currentEvent('swellEnd', 'The swell recedes, leaving only your version of events.'));
  }
  const effects = state.player?.effects;
  if (effects?.hair && Number(effects.hairExpiresAt) <= current.elapsed) {
    delete effects.hair;delete effects.hairExpiresAt;
    events.push(currentEvent('lookChanged', 'The electricity leaves your hair, but the photographs remain.'));
  }
  if (effects?.makeup && Number(effects.makeupExpiresAt) <= current.elapsed) {
    delete effects.makeup;delete effects.makeupExpiresAt;
    events.push(currentEvent('lookChanged', 'The ink disperses. Your reputation does not.'));
  }
  const phase = rushPhaseAt(current, current.elapsed, random);
  Object.assign(current, phase.current);
  events.push(...phase.events);
  current.entities = moved.filter((entity) => {
    const retired = !entity.recoverableClaim && entity.y > cameraY + height + 96 && (entity.kind === 'hazard' || entity.tier === 'ambient' || entity.y > cameraY + height * 2 + 96);
    if (retired) events.push(currentEvent('currentRetired', `${entity.item?.name || 'A current object'} disappears into the lower water.`, { entityId: entity.id }));
    return !retired;
  });
  const spawnInterval = current.rush === 'rush' ? .55 : 2.4;
  const spawnCount = state.mode === 'ocean' ? Math.floor(current.elapsed / spawnInterval) - Math.floor(elapsed / spawnInterval) : 0;
  for (let index = 0; index < Math.min(64, Math.max(0, spawnCount)); index += 1) current.entities.push(spawnCurrentEntity(state, random, viewport));
  const hazardInterval = 15;
  const hazardCount = state.mode === 'ocean' ? Math.floor(current.elapsed / hazardInterval) - Math.floor(elapsed / hazardInterval) : 0;
  for (let index = 0; index < Math.min(8, Math.max(0, hazardCount)); index += 1) current.entities.push(spawnHazardEntity(state, random, viewport));
  boundCurrent(current);
  const target = selectCurrentTarget(state.player, current.entities);
  if ((current.targetId || null) !== (target?.id || null)) {
    current.targetId = target?.id || null;
    events.push(currentEvent('targetChanged', target ? `${target.item?.name || 'Treasure'} is within reach.` : 'The immediate current is clear.', { entityId: target?.id || null }));
  }
  state.current = current;
  return { state, events };
}

export function performSirenCall(input, player, entities = input.current?.entities || []) {
  const state = clone(input);
  const allowedIds = new Set(entities.map(({ id }) => id));
  let revealed = 0;
  state.current.entities = state.current.entities.map((entity) => {
    if (!allowedIds.has(entity.id) || entity.kind !== 'treasure' || entity.tier !== 'concealed' || entity.revealed || distance(player, entity) > 240) return entity;
    revealed += 1;
    return { ...entity, revealed: true, actionable: true };
  });
  const noun = revealed === 1 ? 'one hidden treasure' : `${revealed} hidden treasures`;
  return { state, events: [currentEvent('sirenCall', `Your Siren Call reveals ${noun} in the nearby current.`, { revealed })] };
}

export function collectCurrentEntity(input, entityId) {
  const entity = input.current?.entities?.find(({ id }) => id === entityId);
  if (!entity) return { state: clone(input), events: [currentEvent('notice', 'That treasure has already continued its journey.')] };
  const transition = advanceCombination(input.current?.combo, entity);
  // Acquisition validates capacity before touching the canonical item registry.
  const released = entity.releasedBy && input.inventory?.some((item) => item.id === entity.item?.id && item.ownerId == null);
  const result = acquireCurrentItem(input, entity, transition.combo.multiplier);
  if (!result.events.some(({ type }) => type === 'pickup' || type === 'rarePickup')) return result;
  const pickup = result.events.find(({ type }) => type === 'pickup' || type === 'rarePickup');
  if (pickup) {
    pickup.category = entity.archetypeId || entity.chain;
    pickup.combo = transition.combo.count;
    pickup.rarity = entity.item?.rarity || 'Interesting';
    pickup.recovery = Boolean(released);
  }
  result.state.current.entities = result.state.current.entities.filter(({ id }) => id !== entityId);
  if (result.state.current.targetId === entityId) result.state.current.targetId = null;
  result.state.current.combo = transition.combo;
  if (result.state.current.rush === 'rush') {
    const awarded = result.events.find(({ type }) => type === 'pointAward');
    result.state.current.rushFinds = (Number(result.state.current.rushFinds) || 0) + 1;
    result.state.current.rushPoints = (Number(result.state.current.rushPoints) || 0) + Math.max(0, Number(awarded?.amount) || 0);
  }
  if (transition.resolved) {
    const resolution = resolveCombination(result.state, transition.resolved);
    result.state = resolution.state;
    result.state.current.combo = transition.combo;
    result.events.push(...resolution.events.map((item) => ({ ...item, text: `${combinationLabel(transition.resolved)} resolves at ${transition.resolved.count}. The next chain is already underway.` })));
  }
  result.events.push(currentEvent('combo', `${combinationLabel(transition.combo)} · ${transition.combo.count} · ×${transition.combo.multiplier}`, { combo: transition.combo }));
  return result;
}
