import { ZONE_DEFINITIONS } from './data.mjs';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function isZoneDefinition(definition) {
  return Boolean(
    definition
    && typeof definition.id === 'string'
    && typeof definition.name === 'string'
    && typeof definition.treasureChain === 'string'
    && Array.isArray(definition.palette)
    && Array.isArray(definition.hazards),
  );
}

function zoneDefinition(seed, index) {
  // imul keeps the low 32 bits exact; ordinary multiplication loses them for
  // common persisted seeds and collapses the catalog to a few repeated zones.
  let value = (seed >>> 0) ^ Math.imul((index + 1) | 0, 0x9e3779b9);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  value = (value ^ (value >>> 16)) >>> 0;
  const definition = ZONE_DEFINITIONS[value % ZONE_DEFINITIONS.length];
  return isZoneDefinition(definition) ? definition : ZONE_DEFINITIONS[0];
}

function zoneRecord(seed, index, existing) {
  if (existing && existing.index === index && isZoneDefinition(existing.definition)) return existing;
  const definition = existing?.definition ? ZONE_DEFINITIONS[0] : zoneDefinition(seed, index);
  return { ...existing, index, definition, id: `${definition.id}-${index}`, name: definition.name, palette: [...definition.palette], treasureChain: definition.treasureChain, hazards: [...definition.hazards] };
}

function evidenceLines(value, field) {
  return (Array.isArray(value) ? value : []).map(entry => typeof entry === 'string' ? entry : entry?.[field])
    .filter(line => typeof line === 'string' && line.trim()).slice(-80);
}

function retirementSummary(zone) {
  const incidents = evidenceLines(zone.incidents, 'text');
  const possessions = evidenceLines(zone.possessions, 'name');
  return incidents.length || possessions.length ? { index: zone.index, name: zone.name || zone.definition?.name, incidents, possessions } : null;
}

export function createMotionState(player) {
  return { x: player.x, y: player.y, vx: 0, vy: 0, banking: 0 };
}

export function stepMotion(motion, intent, dt, bounds) {
  const acceleration = 620;
  const drag = Math.pow(0.12, dt);
  const vx = (motion.vx + intent.x * acceleration * dt) * drag;
  const vy = (motion.vy + intent.y * acceleration * dt) * drag;
  return {
    x: clamp(motion.x + vx * dt, 36, bounds.width - 36),
    y: clamp(motion.y + vy * dt, bounds.endless ? -Infinity : 72, bounds.height - 72),
    vx,
    vy,
    banking: clamp(vx / 240, -1, 1),
  };
}

/** One camera contract for spawning, simulation, rendering and hit presentation. */
export function currentViewportFor(player, viewport, world = {}) {
  const width = Math.max(1, Number(viewport?.width) || 390);
  const height = Math.max(1, Number(viewport?.height) || 844);
  return {
    width, height,
    cameraX: clamp((Number(player?.x) || 0) - width / 2, 0, Math.max(0, (Number(world.width) || width) - width)),
    cameraY: clamp((Number(player?.y) || 0) - height / 2, world.endless ? -Infinity : 0, Math.max(0, (Number(world.height) || height) - height)),
  };
}

export function advanceWorld(input, player, random = Math.random) {
  const distance = Math.max(0, 500 - player.y);
  const zoneIndex = Math.floor(distance / 1200);
  if (zoneIndex === input.zoneIndex) return { ...input, distance };
  return ensureActiveZones({ ...input, distance, zoneIndex }, random);
}

export function ensureActiveZones(world, random = Math.random) {
  const source = world && typeof world === 'object' ? world : {};
  const seed = Number.isFinite(source.seed) ? Math.floor(source.seed) : Math.floor(random() * 2147483647);
  const zoneIndex = Math.max(0, Math.floor(Number(source.zoneIndex) || 0));
  const activeIndexes = [zoneIndex - 1, zoneIndex, zoneIndex + 1];
  const active = new Set(activeIndexes);
  const history = [...(Array.isArray(source.history) ? source.history : [])];
  const previousZones = Array.isArray(source.zones) ? source.zones : [];
  for (const zone of previousZones) {
    if (!active.has(zone?.index)) {
      const summary = retirementSummary(zone || {});
      if (summary) {
        const previousIndex = history.findIndex(entry => entry?.index === summary.index);
        const previous = previousIndex >= 0 ? history[previousIndex] : {};
        const merged = {
          ...summary,
          incidents: [...new Set([...evidenceLines(previous.incidents, 'text'), ...summary.incidents])].slice(-80),
          possessions: [...new Set([...evidenceLines(previous.possessions, 'name'), ...summary.possessions])].slice(-80),
        };
        if (previousIndex >= 0) history[previousIndex] = merged;
        else history.push(merged);
      }
    }
  }
  return {
    ...source,
    seed,
    zoneIndex,
    history,
    zones: activeIndexes.map((index) => zoneRecord(seed, index, previousZones.find((zone) => zone?.index === index))),
  };
}

export function nearestActionable(player, entities = [], npcs = [], radius = 120) {
  const candidates = [
    ...entities.filter((entity) => entity && !entity.collected),
    ...npcs.filter(Boolean),
  ].map((candidate) => ({ ...candidate, distance: distance(player, candidate) }))
    .filter((candidate) => Number.isFinite(candidate.distance) && candidate.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
  return candidates[0] || null;
}
