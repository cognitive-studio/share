import { NPC_DEFINITIONS, generateShore } from './data.mjs';
import { normalizeSocialHistory } from './social.mjs';

export const SAVE_KEY = 'siren-shore:save:v2';
export const SAVE_VERSION = 3;

export function pointsForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(Number.MAX_SAFE_INTEGER, (safeLevel - 1) ** 2 * 100);
}

export function levelForPoints(points) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  return Math.floor(Math.sqrt(safePoints / 100)) + 1;
}

export function createDefaultState(random = Math.random) {
  const npcs = Object.fromEntries(NPC_DEFINITIONS.map((npc) => [npc.id, {
    ...npc,
    friendship: 0,
    rivalry: 0,
    cattiness: 1,
    power: 1,
    wins: 0,
    losses: 0,
    possessions: [],
    memories: [],
  }]));
  return {
    version: SAVE_VERSION,
    player: {
      id: 'player',
      name: 'Your Majesty',
      title: 'Unaccredited Mermaid',
      hair: 0,
      tail: 0,
      makeup: 0,
      scales: 0,
      fins: 0,
      purse: 'weekender',
      x: 600,
      y: 500,
    },
    inventory: [],
    purseIds: [],
    equipped: {},
    npcs,
    shore: generateShore(random, 1),
    world: { seed: Math.floor(random() * 2147483647), distance: 0, zoneIndex: 0, zones: [], history: [] },
    current: { entities: [], elapsed: 0, rush: 'drift', rushEndsAt: 0, combo: { chain: null, count: 0, multiplier: 1 }, swell: null },
    social: { relationships: {}, rumors: [], incidents: [], pursuits: [], clock: { elapsed: 0, nextSceneAt: 60 } },
    effects: { recentAwards: [] },
    progression: { points: 0, level: 1, shores: 0, finds: 0, incidents: 0 },
    settings: { music: true, effects: true, haptics: true, reducedMotion: false },
    counters: { item: 0, incident: 0, shore: 0 },
    mode: 'home',
    lastIncident: null,
  };
}

export function nextId(state, prefix) {
  state.counters[prefix] = (state.counters[prefix] || 0) + 1;
  return `${prefix}-${state.counters[prefix]}`;
}

function normalizeItem(item, fallbackId = 'recovered-object') {
  return {
    ...item,
    id: typeof item.id === 'string' && item.id ? item.id : fallbackId,
    name: typeof item.name === 'string' && item.name ? item.name : 'Object of Unclear but Growing Importance',
    description: typeof item.description === 'string' ? item.description : 'Recovered from an earlier version of the story.',
    category: typeof item.category === 'string' ? item.category : 'Find',
    slot: typeof item.slot === 'string' && item.slot ? item.slot : 'treasure',
    rarity: typeof item.rarity === 'string' ? item.rarity : 'Questionable',
    colors: Array.isArray(item.colors) && item.colors.length >= 2 ? item.colors : ['#36e5d1', '#ff4faf'],
    history: Array.isArray(item.history) ? item.history : [],
    parents: Array.isArray(item.parents) ? item.parents : [],
  };
}

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
const recordOrEmpty = (value) => isRecord(value) ? value : {};
const recordsOnly = (value) => Array.isArray(value) ? value.filter(isRecord).map((record) => ({ ...record })) : [];
const finiteNumber = (value, fallback) => Number.isFinite(value) ? value : fallback;

function migrate(candidate) {
  const base = createDefaultState(() => 0.5);
  if (!candidate || typeof candidate !== 'object') return base;
  if ('shore' in candidate && (!candidate.shore || typeof candidate.shore !== 'object')) throw new Error('Invalid shore');
  if ('player' in candidate && (!candidate.player || typeof candidate.player !== 'object')) throw new Error('Invalid player');
  if ('inventory' in candidate && !Array.isArray(candidate.inventory)) throw new Error('Invalid inventory');
  if ('npcs' in candidate && (!candidate.npcs || typeof candidate.npcs !== 'object')) throw new Error('Invalid cast');
  if (candidate.inventory?.some((item) => !item || typeof item !== 'object' || typeof item.id !== 'string')) throw new Error('Invalid inventory item');
  if (candidate.shore?.finds && (!Array.isArray(candidate.shore.finds) || candidate.shore.finds.some((find) => !find || typeof find !== 'object' || typeof find.id !== 'string' || !find.item || typeof find.item !== 'object'))) throw new Error('Invalid shore find');
  if (candidate.mode === 'fight' && (!candidate.fight || typeof candidate.fight !== 'object' || !candidate.fight.npcId)) throw new Error('Orphaned fight');
  const savedNpcs = recordOrEmpty(candidate.npcs);
  const npcs = Object.fromEntries(Object.entries(base.npcs).map(([id, npc]) => {
    const saved = savedNpcs[id] && typeof savedNpcs[id] === 'object' ? savedNpcs[id] : {};
    return [id, {
      ...npc,
      ...saved,
      name: typeof saved.name === 'string' && saved.name ? saved.name : npc.name,
      signatureRead: typeof saved.signatureRead === 'string' ? saved.signatureRead : npc.signatureRead,
      palette: Array.isArray(saved.palette) && saved.palette.length >= 2 ? saved.palette : npc.palette,
      possessions: Array.isArray(saved.possessions) ? saved.possessions.filter((value) => typeof value === 'string') : npc.possessions,
      memories: Array.isArray(saved.memories) ? saved.memories.filter((value) => value && typeof value === 'object') : npc.memories,
      friendship: Number.isFinite(saved.friendship) ? saved.friendship : npc.friendship,
      rivalry: Number.isFinite(saved.rivalry) ? saved.rivalry : npc.rivalry,
      cattiness: Number.isFinite(saved.cattiness) ? saved.cattiness : npc.cattiness,
      power: Number.isFinite(saved.power) ? saved.power : npc.power,
      wins: Number.isFinite(saved.wins) ? saved.wins : npc.wins,
      losses: Number.isFinite(saved.losses) ? saved.losses : npc.losses,
    }];
  }));
  if (candidate.mode === 'fight' && !npcs[candidate.fight.npcId]) throw new Error('Unknown fight opponent');
  const savedProgression = recordOrEmpty(candidate.progression);
  const savedWorld = recordOrEmpty(candidate.world);
  const savedCurrent = recordOrEmpty(candidate.current);
  const savedSocial = recordOrEmpty(candidate.social);
  const savedEffects = recordOrEmpty(candidate.effects);
  const savedCombo = recordOrEmpty(savedCurrent.combo);
  const savedPoints = Number.isFinite(savedProgression.points) ? savedProgression.points : savedProgression.xp;
  const progression = {
    points: Math.max(0, Math.floor(finiteNumber(savedPoints, base.progression.points))),
    shores: finiteNumber(savedProgression.shores, base.progression.shores),
    finds: finiteNumber(savedProgression.finds, base.progression.finds),
    incidents: finiteNumber(savedProgression.incidents, base.progression.incidents),
    level: base.progression.level,
  };
  const merged = {
    ...base,
    ...candidate,
    version: SAVE_VERSION,
    player: { ...base.player, ...(candidate.player || {}) },
    world: {
      ...base.world,
      ...savedWorld,
      seed: finiteNumber(savedWorld.seed, base.world.seed),
      distance: finiteNumber(savedWorld.distance, base.world.distance),
      zoneIndex: finiteNumber(savedWorld.zoneIndex, base.world.zoneIndex),
      zones: recordsOnly(savedWorld.zones),
      history: recordsOnly(savedWorld.history),
    },
    current: {
      ...base.current,
      ...savedCurrent,
      entities: recordsOnly(savedCurrent.entities),
      recoveryClaims: recordsOnly(savedCurrent.recoveryClaims),
      elapsed: finiteNumber(savedCurrent.elapsed, base.current.elapsed),
      rush: typeof savedCurrent.rush === 'string' ? savedCurrent.rush : base.current.rush,
      rushEndsAt: finiteNumber(savedCurrent.rushEndsAt, base.current.rushEndsAt),
      combo: {
        ...base.current.combo,
        ...savedCombo,
        chain: typeof savedCombo.chain === 'string' ? savedCombo.chain : null,
        count: finiteNumber(savedCombo.count, base.current.combo.count),
        multiplier: finiteNumber(savedCombo.multiplier, base.current.combo.multiplier),
      },
      swell: isRecord(savedCurrent.swell) ? { ...savedCurrent.swell } : null,
    },
    social: {
      ...base.social,
      ...savedSocial,
      relationships: isRecord(savedSocial.relationships) ? { ...savedSocial.relationships } : {},
      rumors: recordsOnly(savedSocial.rumors),
      incidents: recordsOnly(savedSocial.incidents),
      pursuits: recordsOnly(savedSocial.pursuits),
      clock: {
        ...base.social.clock,
        ...(isRecord(savedSocial.clock) ? savedSocial.clock : {}),
        elapsed: Math.max(0, finiteNumber(savedSocial.clock?.elapsed, base.social.clock.elapsed)),
        nextSceneAt: Math.max(0, finiteNumber(savedSocial.clock?.nextSceneAt, base.social.clock.nextSceneAt)),
      },
    },
    effects: {
      ...base.effects,
      ...savedEffects,
      recentAwards: recordsOnly(savedEffects.recentAwards),
    },
    progression,
    settings: { ...base.settings, ...(candidate.settings || {}) },
    counters: { ...base.counters, ...(candidate.counters || {}) },
    shore: {
      ...base.shore,
      ...(candidate.shore || {}),
      finds: Array.isArray(candidate.shore?.finds) ? candidate.shore.finds.map((find) => ({ ...find, item: normalizeItem(find.item, `recovered-${find.id}`) })) : base.shore.finds,
    },
    npcs,
    inventory: Array.isArray(candidate.inventory) ? candidate.inventory.map((item) => normalizeItem(item)) : [],
    purseIds: Array.isArray(candidate.purseIds) ? candidate.purseIds : [],
    equipped: candidate.equipped && typeof candidate.equipped === 'object' ? candidate.equipped : {},
  };
  if (!merged.shore.name || !merged.player.name) throw new Error('Invalid save identity');
  if (!['home', 'ocean', 'fight'].includes(merged.mode)) merged.mode = 'home';
  normalizeSocialHistory(merged);
  merged.progression.level = levelForPoints(merged.progression.points);
  return merged;
}

export function loadState(storage = globalThis.localStorage, now = Date.now) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return { state: createDefaultState(), warning: null, recovered: false };
    try {
      return { state: migrate(JSON.parse(raw)), warning: null, recovered: false };
    } catch {
      storage?.setItem(`siren-shore:recovery:${now()}`, raw);
      return { state: createDefaultState(), warning: 'Your previous tide was damaged. We recovered what we could and preserved the wreckage.', recovered: true };
    }
  } catch {
    return { state: createDefaultState(), warning: 'This browser declined storage. You can still play, but this particular scandal will not survive closing the tab.', recovered: false };
  }
}

export function saveState(storage = globalThis.localStorage, state) {
  try {
    const { xp, ...progression } = recordOrEmpty(state?.progression);
    storage?.setItem(SAVE_KEY, JSON.stringify({ ...state, version: SAVE_VERSION, progression }));
    return { ok: true, warning: null };
  } catch {
    return { ok: false, warning: 'This browser declined storage. The current session remains playable.' };
  }
}
