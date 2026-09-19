const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const distance = (a, b) => Math.hypot((Number(a?.x) || 0) - (Number(b?.x) || 0), (Number(a?.y) || 0) - (Number(b?.y) || 0));
const event = (type, text, extra = {}) => ({ type, text, ...extra });
const boundedRoll = (random) => clamp(Number(random?.()) || 0, 0, 1);

const RELATIONSHIP_DEFAULT = Object.freeze({ affinity: 0, rivalry: 0, heat: 0, alliance: false, lastIncidentId: null });
const SCENE_INTERVAL_MIN = 60;
const SCENE_INTERVAL_MAX = 180;
const MAX_INCIDENTS = 80;
const MAX_RUMORS = 40;

export function relationshipKey(actorId, targetId) {
  return `${String(actorId || 'unknown')}→${String(targetId || 'unknown')}`;
}

function socialState(state) {
  state.social = state.social && typeof state.social === 'object' ? state.social : {};
  state.social.relationships = state.social.relationships && typeof state.social.relationships === 'object' ? state.social.relationships : {};
  state.social.incidents = Array.isArray(state.social.incidents) ? state.social.incidents : [];
  state.social.rumors = Array.isArray(state.social.rumors) ? state.social.rumors : [];
  state.social.pursuits = Array.isArray(state.social.pursuits) ? state.social.pursuits : [];
  state.social.clock = state.social.clock && typeof state.social.clock === 'object' ? state.social.clock : { elapsed: 0, nextSceneAt: SCENE_INTERVAL_MIN };
  state.social.clock.elapsed = Math.max(0, Number(state.social.clock.elapsed) || 0);
  state.social.clock.nextSceneAt = Math.max(state.social.clock.elapsed, Number(state.social.clock.nextSceneAt) || SCENE_INTERVAL_MIN);
  state.counters = state.counters && typeof state.counters === 'object' ? state.counters : {};
  return state.social;
}

function socialId(state, prefix) {
  state.counters[prefix] = (Number(state.counters[prefix]) || 0) + 1;
  return `${prefix}-${state.counters[prefix]}`;
}

function edgeFor(state, actorId, targetId) {
  const key = relationshipKey(actorId, targetId);
  const previous = state.social.relationships[key] || {};
  const edge = {
    ...RELATIONSHIP_DEFAULT,
    ...previous,
    affinity: Number(previous.affinity) || 0,
    rivalry: Math.max(0, Number(previous.rivalry) || 0),
    heat: Math.max(0, Number(previous.heat) || 0),
    alliance: Boolean(previous.alliance),
  };
  state.social.relationships[key] = edge;
  return edge;
}

function relationDelta(type, direction) {
  const victim = direction === 'target';
  if (type === 'alliance') return { affinity: 2, rivalry: -1, heat: -.5, alliance: true };
  if (type === 'reconciliation') return { affinity: 1.5, rivalry: -1.5, heat: -1.5, alliance: false };
  if (type === 'gossip') return { affinity: victim ? -1 : -.5, rivalry: victim ? 1.5 : 1, heat: victim ? 1.5 : 1, alliance: false };
  if (type === 'theft' || type === 'snatch') return { affinity: victim ? -4 : -2, rivalry: victim ? 4 : 2, heat: victim ? 4 : 2, alliance: false };
  if (type === 'contest') return { affinity: victim ? -2 : -1, rivalry: victim ? 3 : 1.5, heat: victim ? 3 : 1.5, alliance: false };
  if (type === 'avoidance') return { affinity: victim ? -1 : -.5, rivalry: victim ? 1.25 : .75, heat: victim ? 1.25 : .75, alliance: false };
  return { affinity: victim ? -2.5 : -1.5, rivalry: victim ? 3 : 2, heat: victim ? 3 : 2, alliance: false };
}

function applyDelta(edge, delta, incidentId) {
  edge.affinity += delta.affinity;
  edge.rivalry = Math.max(0, edge.rivalry + delta.rivalry);
  edge.heat = Math.max(0, edge.heat + delta.heat);
  edge.alliance = delta.alliance;
  edge.lastIncidentId = incidentId;
  return { affinity: delta.affinity, rivalry: delta.rivalry, heat: delta.heat, alliance: edge.alliance };
}

function npcMemory(state, npcId, memory) {
  if (!npcId || npcId === 'player' || !state.npcs?.[npcId]) return;
  const memories = state.npcs[npcId].memories = Array.isArray(state.npcs[npcId].memories) ? state.npcs[npcId].memories : [];
  memories.push(memory);
  if (memories.length > 120) memories.splice(0, memories.length - 120);
}

function retireOldIncidents(state) {
  while (state.social.incidents.length > MAX_INCIDENTS) {
    const retired = state.social.incidents.shift();
    const summary = {
      type: 'retiredIncident', incidentId: retired.id, sceneType: retired.type, actorId: retired.actorId,
      targetId: retired.targetId, itemId: retired.itemId || null,
      text: `The ${retired.type} involving ${retired.targetId} remains part of the water's oral history.`,
    };
    npcMemory(state, retired.actorId, summary);
    npcMemory(state, retired.targetId, summary);
    for (const witnessId of retired.witnesses || []) npcMemory(state, witnessId, { ...summary, type: 'retiredWitnessedIncident' });
  }
}

/** Normalizes persisted social history without advancing the simulation. Kept here so runtime and load paths share the same retention contract. */
export function normalizeSocialHistory(state) {
  socialState(state);
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  state.social.relationships = Object.fromEntries(Object.entries(state.social.relationships).filter(([key, edge]) => key.includes('→') && edge && typeof edge === 'object' && !Array.isArray(edge)).map(([key, edge]) => [key, {
    ...RELATIONSHIP_DEFAULT, affinity: number(edge.affinity), rivalry: Math.max(0, number(edge.rivalry)), heat: Math.max(0, number(edge.heat)), alliance: edge.alliance === true,
    lastIncidentId: typeof edge.lastIncidentId === 'string' ? edge.lastIncidentId : null, nextPursuitAt: Math.max(0, number(edge.nextPursuitAt)),
  }]));
  const normalizeRecord = record => ({ ...record, witnesses: Array.isArray(record.witnesses) ? record.witnesses.filter(id => typeof id === 'string') : [], text: typeof record.text === 'string' ? record.text : `${nameFor(state,record.actorId)} and ${nameFor(state,record.targetId)}: ${record.type || 'an unresolved allegation'}.` });
  state.social.incidents = state.social.incidents.filter((incident) => incident && typeof incident === 'object' && typeof incident.actorId === 'string' && typeof incident.targetId === 'string').map(normalizeRecord);
  state.social.rumors = state.social.rumors.filter((rumor) => rumor && typeof rumor === 'object' && typeof rumor.actorId === 'string' && typeof rumor.targetId === 'string').map(normalizeRecord);
  state.social.pursuits = state.social.pursuits.filter(pursuit => pursuit && typeof pursuit.id === 'string' && state.npcs?.[pursuit.npcId]).map(pursuit => ({ ...pursuit, origin: { x: number(pursuit.origin?.x), y: number(pursuit.origin?.y) } })).slice(-8);
  retireOldIncidents(state);
  if (state.social.rumors.length > MAX_RUMORS) state.social.rumors.splice(0, state.social.rumors.length - MAX_RUMORS);
  for (const npc of Object.values(state.npcs || {})) {
    npc.memories = Array.isArray(npc.memories) ? npc.memories.filter((memory) => memory && typeof memory === 'object') : [];
    if (npc.memories.length > 120) npc.memories.splice(0, npc.memories.length - 120);
  }
  const elapsed = Math.max(0, Number(state.social.clock.elapsed) || 0);
  const requested = Number(state.social.clock.nextSceneAt);
  const offset = Number.isFinite(requested) ? requested - elapsed : SCENE_INTERVAL_MIN;
  state.social.clock = { elapsed, nextSceneAt: elapsed + clamp(offset, SCENE_INTERVAL_MIN, SCENE_INTERVAL_MAX) };
  return state;
}

function nameFor(state, id) {
  return id === 'player' ? state.player?.name || 'Your Majesty' : state.npcs?.[id]?.name || String(id || 'Someone');
}

/** Adds a fully attributed scene and its directional aftermath to the permanent social record. */
export function recordIncident(input, incident = {}, random = Math.random) {
  let state = clone(input);
  socialState(state);
  const actorId = typeof incident.actorId === 'string' ? incident.actorId : 'player';
  const targetId = typeof incident.targetId === 'string' && incident.targetId !== actorId ? incident.targetId : Object.keys(state.npcs || {}).find((id) => id !== actorId) || 'player';
  const witnesses = [...new Set((Array.isArray(incident.witnesses) ? incident.witnesses : []).filter((id) => typeof id === 'string' && id !== actorId && id !== targetId))];
  const type = typeof incident.type === 'string' ? incident.type : 'confrontation';
  const publicScene = incident.public !== false;
  const id = typeof incident.id === 'string' ? incident.id : socialId(state, 'incident');
  const actorEdge = edgeFor(state, actorId, targetId);
  const targetEdge = edgeFor(state, targetId, actorId);
  const actorDelta = applyDelta(actorEdge, relationDelta(type, 'actor'), id);
  const targetDelta = applyDelta(targetEdge, relationDelta(type, 'target'), id);
  const object = incident.object || (incident.itemId ? { id: incident.itemId, name: state.inventory?.find((item) => item?.id === incident.itemId)?.name || incident.itemId } : null);
  const scene = {
    id, type, actorId, targetId, witnesses, object, itemId: object?.id || incident.itemId || null,
    text: incident.text || `${nameFor(state, actorId)} and ${nameFor(state, targetId)} have created a ${type} situation.`,
    visibility: publicScene ? 'public' : 'private', public: publicScene,
    at: state.social.clock.elapsed,
    deltas: { [relationshipKey(actorId, targetId)]: actorDelta, [relationshipKey(targetId, actorId)]: targetDelta },
  };
  state.social.incidents.push(scene);
  const zone=state.world?.zones?.find(zone=>zone.index===state.world.zoneIndex);
  if(zone)zone.incidents=[...(zone.incidents||[]),scene.text].slice(-80);
  state.progression.incidents = Math.max(0, Number(state.progression?.incidents) || 0) + 1;
  state.lastIncident = {
    type, incidentId: id, npcId: actorId === 'player' ? targetId : actorId, npcName: nameFor(state, actorId === 'player' ? targetId : actorId),
    itemId: scene.itemId, text: incident.text || `${nameFor(state, actorId)} and ${nameFor(state, targetId)} have created a ${type} situation.`,
  };
  npcMemory(state, actorId, { type: 'incident', incidentId: id, text: state.lastIncident.text, targetId, itemId: scene.itemId });
  npcMemory(state, targetId, { type: 'incident', incidentId: id, text: state.lastIncident.text, actorId, itemId: scene.itemId });
  for (const witnessId of witnesses) npcMemory(state, witnessId, { type: 'witnessedIncident', incidentId: id, text: `Witnessed ${nameFor(state, actorId)} and ${nameFor(state, targetId)} create a ${type} situation.` });
  const events = [event(type, state.lastIncident.text, { incident: scene, incidentId: id })];
  if (publicScene) {
    const rumor = spreadRumor(state, { incidentId: id, actorId, targetId, witnesses, itemId: scene.itemId, type, public: true, silent: true }, random);
    state = rumor.state;
    events.push(event('publicReaction', `${rumor.rumor.witnesses.length || 'The'} mermaid${rumor.rumor.witnesses.length === 1 ? '' : 's'} have been briefed.`, { rumor: rumor.rumor, incidentId: id }));
  }
  retireOldIncidents(state);
  return { state, incident: scene, events };
}

/** Spreads a rumor without inventing an un-attributed scene. */
export function spreadRumor(input, rumor = {}, random = Math.random) {
  const state = clone(input);
  socialState(state);
  const cast = Object.keys(state.npcs || {}).sort();
  const actorId = typeof rumor.actorId === 'string' ? rumor.actorId : cast[0] || 'player';
  const targetId = typeof rumor.targetId === 'string' ? rumor.targetId : cast.find((id) => id !== actorId) || 'player';
  const knownWitnesses = [...new Set((Array.isArray(rumor.witnesses) ? rumor.witnesses : []).filter(Boolean))];
  const additional = cast.filter((id) => id !== actorId && id !== targetId && !knownWitnesses.includes(id));
  if (additional.length && boundedRoll(random) < .72) knownWitnesses.push(additional[Math.min(additional.length - 1, Math.floor(boundedRoll(random) * additional.length))]);
  const record = {
    id: typeof rumor.id === 'string' ? rumor.id : socialId(state, 'rumor'),
    incidentId: rumor.incidentId || null, type: rumor.type || 'gossip', actorId, targetId,
    witnesses: knownWitnesses, itemId: rumor.itemId || null, visibility: 'public', at: state.social.clock.elapsed,
    text: rumor.text || `${nameFor(state, actorId)}'s ${rumor.type || 'gossip'} situation has become public water knowledge.`,
  };
  state.social.rumors.push(record);
  if (state.social.rumors.length > MAX_RUMORS) state.social.rumors.splice(0, state.social.rumors.length - MAX_RUMORS);
  for (const witnessId of record.witnesses) npcMemory(state, witnessId, { type: 'rumor', rumorId: record.id, incidentId: record.incidentId, text: record.text });
  const events = rumor.silent ? [] : [event('gossip', record.text, { rumor: record, incidentId: record.incidentId }), event('publicReaction', `${record.witnesses.length || 'The'} mermaid${record.witnesses.length === 1 ? '' : 's'} have been briefed.`, { rumor: record, incidentId: record.incidentId })];
  return { state, rumor: record, events };
}

function eligibleScenePair(state, random) {
  const npcIds = Object.keys(state.npcs || {}).sort();
  const hot = Object.entries(state.social.relationships)
    .map(([key, edge]) => ({ key, edge, actorId: key.split('→')[0], targetId: key.split('→')[1] }))
    .filter(({ actorId, targetId, edge }) => state.npcs?.[actorId] && state.npcs?.[targetId] && Number(edge.heat) >= 3)
    .sort((a, b) => Number(b.edge.heat) - Number(a.edge.heat) || a.key.localeCompare(b.key));
  if (hot.length) return hot[Math.min(hot.length - 1, Math.floor(boundedRoll(random) * hot.length))];
  const actorIndex = Math.min(Math.max(0, npcIds.length - 1), Math.floor(boundedRoll(random) * npcIds.length));
  const actorId = npcIds[actorIndex] || 'player';
  const targets = npcIds.filter((id) => id !== actorId);
  const targetId = targets[Math.min(Math.max(0, targets.length - 1), Math.floor(boundedRoll(random) * targets.length))] || 'player';
  return { actorId, targetId, edge: edgeFor(state, actorId, targetId) };
}

/** Advances an irregular 60–180 second social clock, deterministically when supplied a deterministic random source. */
export function advanceSocialClock(input, elapsed, random = Math.random) {
  let state = { ...input, counters: { ...input.counters }, social: { ...input.social, clock: { ...input.social?.clock } } };
  socialState(state);
  const events = [];
  state.social.clock.elapsed += Math.max(0, Number(elapsed) || 0);
  let scenes = 0;
  while (state.social.clock.elapsed >= state.social.clock.nextSceneAt && scenes < 4) {
    // The idle clock shares history. A real scene starts a transaction before
    // edgeFor is allowed to create or change any relationship.
    state = clone(state);
    const pair = eligibleScenePair(state, random);
    const roll = boundedRoll(random);
    const type = roll < .25 ? 'gossip' : roll < .55 ? 'confrontation' : roll < .78 ? 'alliance' : 'reconciliation';
    const witnesses = Object.keys(state.npcs || {}).filter((id) => id !== pair.actorId && id !== pair.targetId).sort().slice(0, boundedRoll(random) < .5 ? 1 : 2);
    const scene = recordIncident(state, {
      type, actorId: pair.actorId, targetId: pair.targetId, witnesses, public: true,
      text: type === 'alliance' ? `${nameFor(state, pair.actorId)} and ${nameFor(state, pair.targetId)} form an alliance with absolutely no visible downside.` :
        type === 'reconciliation' ? `${nameFor(state, pair.actorId)} and ${nameFor(state, pair.targetId)} reach a temporary and highly editorial reconciliation.` :
        `${nameFor(state, pair.actorId)} makes ${nameFor(state, pair.targetId)}'s business the ocean's business.`,
    }, random);
    state = scene.state;
    events.push(...scene.events);
    state.social.clock.nextSceneAt = state.social.clock.elapsed + SCENE_INTERVAL_MIN + boundedRoll(random) * (SCENE_INTERVAL_MAX - SCENE_INTERVAL_MIN);
    scenes += 1;
  }
  return { state, events };
}

/** Returns the most motivated known mermaid who may later pursue the player; it never forces an encounter. */
export function nextPursuit(input, zoneIndex = 0) {
  const state = input;
  const candidates = Object.entries(state.social.relationships)
    .map(([key, edge]) => ({ actorId: key.split('→')[0], targetId: key.split('→')[1], edge }))
    .filter(({ actorId, targetId, edge }) => edge && state.npcs?.[actorId] && targetId === 'player' && Number(edge.heat) >= 4 && (!Number(edge.nextPursuitAt) || Number(edge.nextPursuitAt) <= state.social.clock.elapsed))
    .sort((a, b) => Number(b.edge.heat) - Number(a.edge.heat) || a.actorId.localeCompare(b.actorId));
  const candidate = candidates[0];
  if (!candidate) return null;
  const entry = ['below', 'left', 'right'][Math.abs(Math.floor(Number(zoneIndex) || 0)) % 3];
  return {
    id: `pursuit-${candidate.actorId}-${Math.max(0, Math.floor(Number(zoneIndex) || 0))}-${candidate.edge.lastIncidentId || 'heat'}`,
    type: 'pursuit', npcId: candidate.actorId, entry,
    reason: { actorId: candidate.actorId, targetId: 'player', heat: Number(candidate.edge.heat) || 0, lastIncidentId: candidate.edge.lastIncidentId || null },
  };
}

/** Resolves a pursuit as an invitation to engage or a deliberate decision to swim away. Neither choice harms the player. */
export function resolvePursuit(input, pursuit, choice = 'swimAway') {
  const actorId = pursuit?.npcId;
  if (!actorId) return { state: clone(input), events: [event('notice', 'That alleged pursuit has already dissolved into water.')] };
  const type = choice === 'engage' ? 'confrontation' : 'avoidance';
  const result = recordIncident(input, {
    type, actorId, targetId: 'player', witnesses: [], public: false,
    text: choice === 'engage' ? `${nameFor(input, actorId)} gets the audience she wanted. You decide what happens next.` : `${nameFor(input, actorId)} watches you swim away. The lack of access becomes part of her story.`,
  });
  const state = result.state;
  npcMemory(state, actorId, {
    type: choice === 'engage' ? 'pursuitEngaged' : 'pursuitAvoided', pursuitId: pursuit.id,
    text: choice === 'engage' ? 'The player accepted a pursuit.' : 'The player swam away from a pursuit.',
  });
  edgeFor(state, actorId, 'player').nextPursuitAt = state.social.clock.elapsed + SCENE_INTERVAL_MIN + (choice === 'engage' ? 60 : 120);
  state.social.pursuits = state.social.pursuits.filter(({ id }) => id !== pursuit.id);
  return { state, events: [event('pursuit', choice === 'engage' ? `${nameFor(state, actorId)} arrives with an agenda.` : `${nameFor(state, actorId)} is left with a wake and a memory.`, { pursuit, choice, incidentId: result.incident.id })] };
}

/** Clears transient outing pursuit state at an outing boundary while preserving the player's chosen distance as memory. */
export function reconcilePursuitForOuting(input, pursuit = null, choice = 'swimAway') {
  if (!pursuit) {
    const state = clone(input);
    socialState(state);
    state.social.pursuits = [];
    return { state, events: [] };
  }
  const result = resolvePursuit(input, pursuit, choice);
  result.state.social.pursuits = [];
  return result;
}

const TEMPERAMENT = Object.freeze({
  territorial: .16,
  imperial: .13,
  volatile: .11,
  chaotic: .09,
  archival: .07,
  grand: .07,
  social: .04,
  deadpan: .02,
});

function ownerPossessions(state, ownerId) {
  return ownerId !== 'player' && state.npcs?.[ownerId]?.possessions;
}

function appendHistory(item, note) {
  item.history = Array.isArray(item.history) ? item.history : [];
  if (typeof note === 'string' && note.trim()) item.history.push(note);
}

/**
 * The single authority for moving an existing item record between the player,
 * an NPC, or the unowned current. It de-duplicates legacy records and removes
 * every stale owner reference before assigning the destination.
 */
export function transferPossession(input, itemId, fromId = null, toId = null, note = '') {
  const state = clone(input);
  const records = state.inventory.filter((item) => item?.id === itemId);
  if (!records.length) return { state, item: null, events: [event('notice', 'That object has left no reliable paperwork.')] };
  const item = records.reduce((best, candidate) => ((candidate.history?.length || 0) > (best.history?.length || 0) ? candidate : best));
  item.history = [...new Set(records.flatMap((record) => Array.isArray(record.history) ? record.history : []))];
  state.inventory = state.inventory.filter((record) => record?.id !== itemId);
  state.inventory.push(item);

  state.purseIds = (state.purseIds || []).filter((id) => id !== itemId);
  clearEquippedItem(state, itemId);
  for (const npc of Object.values(state.npcs || {})) npc.possessions = (npc.possessions || []).filter((id) => id !== itemId);

  item.ownerId = toId || null;
  appendHistory(item, note);
  if (toId === 'player') {
    if (state.mode === 'ocean' || state.mode === 'fight') state.purseIds.push(itemId);
  } else if (ownerPossessions(state, toId)) {
    state.npcs[toId].possessions.push(itemId);
  }
  return { state, item, events: [event('possessionTransferred', `${item.name} changes hands.`, { itemId, fromId, toId })] };
}

function entityMatchesPreference(entity, preference) {
  return entity?.archetypeId === preference || entity?.item?.slot === preference || entity?.item?.category === preference;
}

/** Pick a visible item using taste first, then its worth, proximity, and the current rivalry. */
export function chooseNpcTarget(npc, entities = [], state = {}) {
  const rivalry = Math.max(0, Number(state.npcs?.[npc?.id]?.rivalry ?? npc?.rivalry) || 0);
  return entities
    .filter((entity) => entity?.kind !== 'hazard' && entity?.contestResolvedBy !== 'player' && entity?.actionable !== false && entity?.revealed !== false && !entity?.collected && Number.isFinite(entity?.x) && Number.isFinite(entity?.y))
    .map((entity) => {
      const preference = entityMatchesPreference(entity, npc?.preference) ? 500000 : 0;
      const value = Math.max(0, Number(entity.points) || 0);
      const proximity = distance(npc, entity) * 220;
      const playerClaim = entity?.contestedBy === 'player' || entity?.claimedBy === 'player' || state.current?.targetId === entity.id;
      const rivalryBonus = playerClaim ? rivalry * 24000 : 0;
      return { entity, score: preference + value + rivalryBonus - proximity };
    })
    .sort((a, b) => b.score - a.score || String(a.entity.id).localeCompare(String(b.entity.id)))[0]?.entity || null;
}

/** Advance a runtime-only NPC intent with acceleration and glide instead of teleporting. */
export function stepNpcPursuit(npcRuntime = {}, target = null, dt = 0) {
  const seconds = clamp(Number(dt) || 0, 0, .1);
  const runtime = { ...npcRuntime };
  if (!target) {
    return {
      ...runtime,
      targetId: null,
      mode: 'drift',
      vx: (Number(runtime.vx) || 0) * Math.pow(.22, seconds),
      vy: (Number(runtime.vy) || 0) * Math.pow(.22, seconds),
      frustration: Math.min(8, (Number(runtime.frustration) || 0) + seconds),
    };
  }
  const dx = target.x - (Number(runtime.x) || 0);
  const dy = target.y - (Number(runtime.y) || 0);
  const length = Math.hypot(dx, dy) || 1;
  const speed = 105 + Math.min(95, (Number(runtime.frustration) || 0) * 12);
  const blend = clamp(seconds * 5.5, 0, 1);
  const vx = (Number(runtime.vx) || 0) + ((dx / length) * speed - (Number(runtime.vx) || 0)) * blend;
  const vy = (Number(runtime.vy) || 0) + ((dy / length) * speed - (Number(runtime.vy) || 0)) * blend;
  return {
    ...runtime,
    targetId: target.id,
    mode: 'pursue',
    x: (Number(runtime.x) || 0) + vx * seconds,
    y: (Number(runtime.y) || 0) + vy * seconds,
    vx,
    vy,
    frustration: Math.max(0, (Number(runtime.frustration) || 0) - seconds * .7),
  };
}

function registerEntityItem(state, entity) {
  const records = state.inventory.filter((item) => item?.id === entity?.item?.id);
  if (!records.length && entity?.item?.id) state.inventory.push({ ...entity.item, history: [...(entity.item.history || [])] });
  return entity?.item?.id || null;
}

function npcClaimChance(state, npc, entity) {
  const playerDistance = distance(state.player, entity);
  const npcDistance = Number.isFinite(npc?.x) && Number.isFinite(npc?.y) ? distance(npc, entity) : playerDistance;
  const rivalry = Math.max(0, Number(npc?.rivalry) || 0);
  const positional = clamp((playerDistance - npcDistance) / 180, -.22, .22);
  return clamp(.45 + (TEMPERAMENT[npc?.temperament] || .06) + positional + Math.min(.16, rivalry * .025), .12, .92);
}

function contestBounds(state) {
  const source = state.social?.contestBounds || {};
  const minX = Number.isFinite(source.minX) ? source.minX : 36;
  const maxX = Math.max(minX, Number.isFinite(source.maxX) ? source.maxX : 1764);
  const minY = Number.isFinite(source.minY) ? source.minY : 72;
  const maxY = Math.max(minY, Number.isFinite(source.maxY) ? source.maxY : 1328);
  return { minX, maxX, minY, maxY };
}

function clearContestBounds(state) {
  if (state.social && 'contestBounds' in state.social) delete state.social.contestBounds;
}

function displaceContestants(state, npcId) {
  const npc = state.npcs[npcId];
  const dx = (Number(state.player.x) || 0) - (Number(npc.x) || 0);
  const dy = (Number(state.player.y) || 0) - (Number(npc.y) || 0);
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length || 1, y: dy / length };
  const bounds = contestBounds(state);
  const push = 26;
  const player = {
    x: clamp((Number(state.player.x) || 0) + unit.x * push, bounds.minX, bounds.maxX),
    y: clamp((Number(state.player.y) || 0) + unit.y * push, bounds.minY, bounds.maxY),
  };
  const rival = {
    x: clamp((Number(npc.x) || 0) - unit.x * push, bounds.minX, bounds.maxX),
    y: clamp((Number(npc.y) || 0) - unit.y * push, bounds.minY, bounds.maxY),
  };
  state.player.x = player.x;state.player.y = player.y;
  npc.x = rival.x;npc.y = rival.y;
  clearContestBounds(state);
  return {
    bounds,
    player: { ...player, vx: unit.x * push * .6, vy: unit.y * push * .6 },
    npc: { ...rival, vx: -unit.x * push * .6, vy: -unit.y * push * .6 },
  };
}

/** Resolve an NPC/player collision around one current entity. Nobody is harmed; the loser is displaced. */
export function resolveContestedPickup(input, npcId, entityId, random = Math.random) {
  let state = clone(input);
  const npc = state.npcs?.[npcId];
  const entity = state.current?.entities?.find((entry) => entry?.id === entityId && entry.kind !== 'hazard');
  if (!npc || !entity || !entity.item) return { state, winner: null, events: [event('notice', 'That disputed object has already continued its journey.')] };
  if (entity.contestResolvedBy === 'player') {
    return { state, winner: 'player', contested: false, impact: null, events: [event('notice', `${entity.item.name} is already yours socially. Make purse room if you want the physical object too.`, { npcId, entityId, itemId: entity.item.id, incidentId: entity.contestIncidentId || null })] };
  }
  const npcDistance = distance(npc, entity);
  const playerDistance = distance(state.player, entity);
  const contested = Number.isFinite(npc?.x) && Number.isFinite(npc?.y) && npcDistance <= 56 && playerDistance <= 92;
  const npcWins = !contested || boundedRoll(random) < npcClaimChance(state, npc, entity);
  const impact = contested ? displaceContestants(state, npcId) : null;
  if (!contested) clearContestBounds(state);
  const displacement = impact ? { x: impact.player.x - input.player.x, y: impact.player.y - input.player.y } : { x: 0, y: 0 };
  if (!npcWins) {
    const itemId = entity.item.id;
    const social = contested ? recordIncident(state, {
      type: 'contest', actorId: 'player', targetId: npcId, witnesses: [], itemId, public: true,
      text: `${state.player.name} holds the line on ${entity.item.name}; ${npc.name} is left with the water's version of events.`,
    }, random) : null;
    if (social) state = social.state;
    const resolvedEntity = state.current?.entities?.find((entry) => entry?.id === entityId);
    if (resolvedEntity && social) {
      resolvedEntity.contestResolvedBy = 'player';
      resolvedEntity.contestIncidentId = social.incident.id;
      resolvedEntity.recoverableClaim = true;
      resolvedEntity.claimStatus = 'secured';
      resolvedEntity.vx = 0;
      resolvedEntity.vy = 0;
    }
    return {
      state,
      winner: 'player',
      contested,
      impact,
      events: [event('contestImpact', `${npc.name} lunges for ${entity.item.name}; you retain the better angle.`, { npcId, entityId, itemId, displacement, impact, incidentId: social?.incident?.id || null }), ...(social?.events || [])],
    };
  }
  const itemId = registerEntityItem(state, entity);
  const transfer = transferPossession(state, itemId, null, npcId, `Claimed from the Treasure Current by ${npc.name}.`);
  state = transfer.state;
  state.current.entities = state.current.entities.filter((entry) => entry.id !== entityId);
  if (state.current.targetId === entityId) state.current.targetId = null;
  const claimant = state.npcs[npcId];
  claimant.rivalry += 1;
  npcMemory(state, npcId, { type: 'currentClaim', itemId, itemName: transfer.item.name, text: `Claimed ${transfer.item.name} in contested water.` });
  state.lastIncident = { type: 'npcClaim', npcId, npcName: claimant.name, itemId, itemName: transfer.item.name, text: `${claimant.name} claimed ${transfer.item.name} from the Treasure Current.` };
  const social = contested ? recordIncident(state, {
    type: 'contest', actorId: npcId, targetId: 'player', witnesses: [], itemId, public: true,
    text: `${claimant.name} claims ${transfer.item.name} in full view of the current.`,
  }, random) : null;
  if (social) state = social.state;
  return {
    state,
    winner: npcId,
    contested,
    impact,
    events: [event(contested ? 'contestImpact' : 'npcPickup', contested ? `${claimant.name} bodies through the claim for ${transfer.item.name}. The collision was entirely nonlethal and deeply personal.` : `${claimant.name} claims ${transfer.item.name} before you reach the situation.`, { npcId, entityId, itemId, displacement, impact, incidentId: social?.incident?.id || null }), ...(social?.events || [])],
  };
}

function playerAtRiskItem(state) {
  return (state.purseIds || []).map((id) => state.inventory.find((item) => item?.id === id && item.ownerId === 'player')).find(Boolean) || null;
}

/** NPCs can take an at-risk field item; home storage remains untouched. */
export function attemptNpcTheft(input, npcId, random = Math.random) {
  const npc = input.npcs?.[npcId];
  const item = npc && playerAtRiskItem(input);
  // An empty purse is normal ocean state, not a transaction or an announcement.
  // Do not traverse/clone its safe lifetime archive for a recurring proximity check.
  if (!npc || !item) return { state: input, events: [] };
  const chance = clamp(.16 + (TEMPERAMENT[npc.temperament] || .06) + Math.min(.24, Math.max(0, npc.rivalry) * .04), .12, .7);
  if (boundedRoll(random) >= chance) return { state: input, events: [event('contest', `${npc.name} reaches for ${item.name}, then thinks better of the paperwork.`, { npcId, itemId: item.id })] };
  const transfer = transferPossession(input, item.id, 'player', npcId, `Lifted by ${npc.name} in open water.`);
  let state = transfer.state;
  const recipient = state.npcs[npcId];
  recipient.rivalry += 2;
  recipient.memories.push({ type: 'theft', itemId: item.id, itemName: item.name, text: `Lifted ${item.name} from ${state.player.name}.` });
  state.lastIncident = { type: 'npcTheft', npcId, npcName: recipient.name, itemId: item.id, itemName: item.name, text: `${recipient.name} lifted ${item.name} from ${state.player.name}.` };
  const social = recordIncident(state, {
    type: 'theft', actorId: npcId, targetId: 'player', witnesses: [], itemId: item.id, public: true,
    text: `${recipient.name} takes ${item.name}. It is now a recovery story.`,
  }, random);
  state = social.state;
  // One outcome owns the sound, haptic and narration; the full attributed
  // incident and rumor remain durable state and travel as event metadata.
  return { state, events: [event('npcTheft', `${recipient.name} takes ${item.name}. It is now a recovery story.`, { npcId, itemId: item.id, incidentId: social.incident.id, incident: social.incident })] };
}

function clearEquippedItem(state, itemId) {
  for (const [slot, equippedId] of Object.entries(state.equipped || {})) if (equippedId === itemId) delete state.equipped[slot];
}
