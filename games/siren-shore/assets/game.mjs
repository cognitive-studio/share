import { POINT_AWARDS, PURSES, generateItem, generateShore } from './data.mjs';
import { levelForPoints, nextId } from './state.mjs';
import { recordIncident, transferPossession } from './social.mjs';

const clone = (value) => structuredClone(value);

function event(type, text, extra = {}) {
  return { type, text, ...extra };
}

export function awardPoints(state, amount, reason, events) {
  const points = Math.max(0, Math.floor(Number(amount) || 0));
  const before = state.progression.level;
  state.progression.points += points;
  state.progression.level = levelForPoints(state.progression.points);
  if (state.progression.level > before) {
    state.player.title = titleForLevel(state.progression.level);
    events.push(event('levelUp', `Siren Level ${state.progression.level}. ${state.player.title}.`, { level: state.progression.level, reason }));
  }
  events.push(event('pointAward', `${points.toLocaleString()} Siren Points.`, { amount: points, total: state.progression.points, reason }));
}

function award(state, amount, reason, events) {
  awardPoints(state, amount, reason, events);
}

function titleForLevel(level) {
  if (level >= 1000) return 'Unregulated Ocean Institution';
  if (level >= 100) return 'Internationally Discussed Mermaid';
  if (level >= 25) return 'Publicly Misunderstood Siren';
  if (level >= 10) return 'Grotto Social Threat';
  if (level >= 3) return 'Mermaid of Developing Consequence';
  return 'Unaccredited Mermaid';
}

function ensureFinds(state, random) {
  const count = state.shore.findCount || 10;
  state.shore.finds = Array.from({ length: count }, (_, index) => {
    const id = nextId(state, 'item');
    return {
      id: `find-${state.shore.id}-${index}`,
      x: 120 + random() * 1560,
      y: 140 + random() * 1160,
      collected: false,
      item: generateItem(random, { id, shoreName: state.shore.name }),
    };
  });
}

function seedNpcPossessions(state, random) {
  for (const npc of Object.values(state.npcs)) {
    if (npc.possessions.length) continue;
    const item = generateItem(random, {
      id: nextId(state, 'item'),
      ownerId: npc.id,
      shoreName: `${npc.name}’s private collection`,
    });
    item.history.push(`Brought into public view by ${npc.name}.`);
    npc.possessions.push(item.id);
    state.inventory.push(item);
  }
}

function purse(state) {
  return PURSES.find(({ id }) => id === state.player.purse) || PURSES[1];
}

function hasPurseRoom(state) {
  return state.purseIds.length < purse(state).capacity;
}

function clearEquippedItem(state, itemId) {
  for (const [slot, equippedId] of Object.entries(state.equipped)) if (equippedId === itemId) delete state.equipped[slot];
}

function resetCurrent(state) {
  // Ambient water is disposable. Released possessions and won-but-unpacked
  // claims are not: carry their recovery handles to the next outing.
  const entities = (state.current?.entities || []).filter(entity => entity.releasedBy || entity.recoverableClaim || entity.contestResolvedBy === 'player');
  state.current = { ...state.current, entities, elapsed: 0, rush: 'drift', rushEndsAt: 0, nextRushAt: 0, rushFinds: 0, rushPoints: 0, combo: { chain: null, count: 0, multiplier: 1 }, targetId: null, swell: null, nextSwellAt: 0 };
}

export function resolveCombination(input, combo) {
  const state = clone(input);
  const resolved = {
    chain: typeof combo?.chain === 'string' ? combo.chain : null,
    count: Math.max(0, Math.floor(Number(combo?.count) || 0)),
    multiplier: Math.max(1, Math.floor(Number(combo?.multiplier) || 1)),
  };
  state.current = { ...state.current, combo: { chain: null, count: 0, multiplier: 1 } };
  return { state, events: [event('comboResolved', `${resolved.count} ${resolved.chain || 'treasure'} finds settle into your permanent legend.`, { combo: resolved })] };
}

export function createOuting(input, random = Math.random) {
  const state = clone(input);
  state.mode = 'ocean';
  state.player.x = 600;
  state.player.y = 500 - Math.max(0, Number(state.world?.distance) || 0);
  resetCurrent(state);
  ensureFinds(state, random);
  seedNpcPossessions(state, random);
  return { state, events: [event('enter', `You enter ${state.shore.name}. The ocean has already heard several versions of the story.`)] };
}

export function collectFind(input, findId) {
  let state = clone(input);
  const events = [];
  const find = state.shore.finds?.find(({ id }) => id === findId);
  if (!find || find.collected) return { state, events: [event('notice', 'There is nothing left here but implication.')] };
  if (!hasPurseRoom(state)) return { state, events: [event('notice', `${purse(state).name} is full. Return home, edit the bag, then come back for her.`)] };
  find.collected = true;
  const item = find.item;
  state.inventory.push(item);
  state = transferPossession(state, item.id, null, 'player', `Claimed by ${state.player.name} at ${state.shore.name}.`).state;
  state.progression.finds += 1;
  state.lastIncident = { type: 'find', itemId: item.id, itemName: item.name, shore: state.shore.name, text: `${state.player.name} found ${item.name}.` };
  events.push(event(item.rarity.includes('One') || item.rarity.includes('Museum') ? 'rareFind' : 'find', `${item.name}. Unfortunately, it is perfect.`, { itemId: item.id }));
  award(state, POINT_AWARDS.find, 'find', events);
  return { state, events };
}

export function acquireCurrentItem(input, entity, multiplier = 1) {
  let state = clone(input);
  if (!entity?.item || !entity.id) return { state, events: [event('notice', 'That current has nothing you can reasonably claim.')] };
  if (!hasPurseRoom(state)) return { state, events: [event('notice', `${purse(state).name} is full. Return home, edit the bag, then come back for her.`)] };
  let item = state.inventory.find(({ id }) => id === entity.item.id);
  if (!item) {
    item = { ...entity.item, history: [...(entity.item.history || [])] };
    state.inventory.push(item);
  }
  item.origin = item.origin || `Recovered from the Treasure Current at ${state.shore.name}.`;
  state = transferPossession(state, item.id, null, 'player', `Claimed by ${state.player.name} from the Treasure Current at ${state.shore.name}.`).state;
  item = state.inventory.find(({ id }) => id === entity.item.id);
  state.progression.finds += 1;
  state.lastIncident = { type: 'currentPickup', itemId: item.id, itemName: item.name, shore: state.shore.name, text: `${state.player.name} claimed ${item.name} from the Treasure Current.` };
  const zone=state.world?.zones?.find(zone=>zone.index===state.world.zoneIndex);
  if(zone)zone.possessions=[...(zone.possessions||[]),item.name].slice(-80);
  const events = [];
  const rare = entity.tier === 'legendary' || item.rarity?.includes('One') || item.rarity?.includes('Museum');
  const basePoints = Math.max(0, Math.floor(Number(entity.points) || 0));
  const appliedMultiplier = Math.max(1, Math.floor(Number(multiplier) || 1));
  const points = basePoints * appliedMultiplier;
  events.push(event(rare ? 'rarePickup' : 'pickup', `${item.name}. The current has made its position clear.`, { itemId: item.id, points, multiplier: appliedMultiplier, tier: entity.tier || 'ambient' }));
  award(state, points, 'Treasure Current', events);
  return { state, events };
}

export function packItem(input, itemId) {
  const state = clone(input);
  const selectedPurse = purse(state);
  if (state.purseIds.includes(itemId)) return { state, events: [event('notice', 'That is already in the purse, creating tension.')] };
  if (state.purseIds.length >= selectedPurse.capacity) return { state, events: [event('notice', `${selectedPurse.name} is full. Edit your truth.`)] };
  if (!state.inventory.some(({ id, ownerId }) => id === itemId && (ownerId === 'player' || ownerId == null))) return { state, events: [event('notice', 'You cannot pack what is not currently yours.')] };
  state.purseIds.push(itemId);
  const item = state.inventory.find(({ id }) => id === itemId);
  item.ownerId = 'player';
  item.history.push(`Packed in the ${selectedPurse.name}; therefore placed at risk.`);
  return { state, events: [event('pack', `${item.name} enters the purse and the public record.`)] };
}

export function equipItem(input, itemId) {
  const state = clone(input);
  const item = state.inventory.find(({ id }) => id === itemId && (id === itemId));
  if (!item || item.ownerId !== 'player') return { state, events: [event('notice', 'Possession is nine-tenths of this interface.')] };
  state.equipped[item.slot] = item.id;
  item.history.push(`Worn publicly by ${state.player.name}.`);
  return { state, events: [event('equip', `${item.name} is now part of the argument.`)] };
}

export function remixItems(input, itemIds, random = Math.random) {
  const state = clone(input);
  const sources = itemIds.map((id) => state.inventory.find((item) => item.id === id)).filter(Boolean);
  if (sources.length < 2) return { state, events: [event('notice', 'Remixing requires at least two regrettable decisions.')] };
  state.inventory = state.inventory.filter((item) => !itemIds.includes(item.id));
  state.purseIds = state.purseIds.filter((id) => !itemIds.includes(id));
  for (const id of itemIds) clearEquippedItem(state, id);
  const child = generateItem(random, { id: nextId(state, 'item'), ownerId: 'player', shoreName: 'your private grotto workroom' });
  child.name = `${sources[0].name.split(' ').slice(0, 2).join(' ')} ${sources.at(-1).name.split(' ').at(-1)} Situation`;
  child.parents = sources.map(({ id, name }) => ({ id, name }));
  child.history = sources.flatMap(({ history }) => history).concat(`Remixed by ${state.player.name} from ${sources.map(({ name }) => name).join(' and ')}.`);
  state.inventory.push(child);
  const events = [event('remix', `${child.name} now exists. No governing body was consulted.`, { itemId: child.id })];
  award(state, POINT_AWARDS.remix, 'remix', events);
  return { state, events };
}

function npcItem(state, npc) {
  const disputed = state.social?.incidents?.filter(incident => incident.actorId === npc.id || incident.targetId === npc.id).map(incident => incident.itemId) || [];
  const owned = npc.possessions.map((id) => state.inventory.find((item) => item.id === id && item.ownerId === npc.id)).filter(Boolean);
  return owned.find(item => disputed.includes(item.id)) || owned[0];
}

function playerAtRiskItem(state) {
  const candidates = state.purseIds.map((id) => state.inventory.find((item) => item.id === id)).filter(Boolean);
  return candidates[0] || null;
}

function rememberedObject(state, npc) {
  const worn = Object.values(state.equipped);
  return npc.memories.find((memory) => memory.itemId && worn.includes(memory.itemId));
}

export function resolveEncounter(input, npcId, action, random = Math.random) {
  let state = clone(input);
  let npc = state.npcs[npcId];
  if (!npc) return { state, events: [event('notice', 'That mermaid has left the jurisdiction.')] };
  const events = [];
  const memory = rememberedObject(state, npc);
  if (action === 'greet') {
    const itemName = state.inventory.find(item => item.id === memory?.itemId)?.name || memory?.itemName || 'disputed object';
    const text = memory ? `${npc.name} sees the ${itemName}. “You are still wearing my ${String(itemName).toLowerCase()}. I respect the stamina, not the decision.”` : `${npc.name}: “${npc.signatureRead}”`;
    return { state, events: [event('greet', text)] };
  }
  if (action === 'leave') return { state, events: [event('leave', 'You choose peace. This is not the same as forgiveness.')] };
  if (action === 'compliment') {
    npc.friendship += 2;
    npc.memories.push({ type: 'compliment', text: 'Received a surprisingly sincere compliment.' });
    award(state, POINT_AWARDS.compliment, 'compliment', events);
    events.unshift(event('compliment', `${npc.name} accepts the compliment as her legal due.`));
  } else if (action === 'trade') {
    const theirs = npcItem(state, npc);
    const yours = playerAtRiskItem(state);
    if (theirs && yours) {
      state = transferPossession(state, yours.id, 'player', npcId, `Traded by ${state.player.name} to ${npc.name}.`).state;
      state = transferPossession(state, theirs.id, npcId, 'player', `Traded by ${npc.name} to ${state.player.name}.`).state;
      npc = state.npcs[npcId];
      npc.friendship += 1;
      events.push(event('trade', `${npc.name} accepts the trade and immediately revises the story.`, { itemId: theirs.id }));
      award(state, POINT_AWARDS.trade, 'trade', events);
    } else events.push(event('notice', 'A trade requires each party to bring property and delusion.'));
  } else if (action === 'shade') {
    npc.rivalry += 1;
    npc.cattiness += 1;
    npc.memories.push({ type: 'shade', text: 'Was read in open water.' });
    state.lastIncident = { type: 'shade', npcId, npcName: npc.name, text: `${state.player.name} read ${npc.name} in open water.` };
    events.push(event('shade', `${npc.name}: “${npc.signatureRead}” You decline to be devastated.`));
    award(state, POINT_AWARDS.shade, 'shade', events);
  } else if (action === 'snatch') {
    const theirs = npcItem(state, npc);
    if (!theirs) events.push(event('notice', `${npc.name} has nothing available except an attitude.`));
    else if (!hasPurseRoom(state)) events.push(event('notice', 'Your purse is full. Even larceny requires editorship.'));
    else if (random() < 0.58) {
      state = transferPossession(state, theirs.id, npcId, 'player', `Snatched from ${npc.name} by ${state.player.name}.`).state;
      npc = state.npcs[npcId];
      npc.rivalry += 4;
      npc.memories.push({ type: 'theft', itemId: theirs.id, itemName: theirs.name, text: `${state.player.name} stole ${theirs.name}.` });
      state.lastIncident = { type: 'snatch', itemId: theirs.id, itemName: theirs.name, npcId, npcName: npc.name, text: `${state.player.name} took ${theirs.name} from ${npc.name}.` };
      events.push(event('snatch', `Property changed hands. ${npc.name} is constructing a narrative.`, { itemId: theirs.id }));
      award(state, POINT_AWARDS.snatch, 'snatch', events);
    } else {
      npc.rivalry += 2;
      state.lastIncident = { type: 'snatch', npcId, npcName: npc.name, text: `${npc.name} stopped ${state.player.name} mid-snatch and announced the result.` };
      events.push(event('loss', `${npc.name} catches your wrist and your entire premise.`));
    }
  } else if (action === 'fight') {
    state.mode = 'fight';
    state.fight = { npcId, playerScore: 0, npcScore: 0, round: 0 };
    events.push(event('fight', `${npc.name} squares her shoulders. Nobody is dying. Dignity has received no such guarantee.`));
  }
  if (['shade','snatch'].includes(action) && events.some(entry => entry.type !== 'notice')) {
    const social = recordIncident(state, { type: action, actorId: 'player', targetId: npcId, itemId: state.lastIncident?.itemId, text: state.lastIncident?.text, public: true }, random);
    state = social.state;
    // Existing action events already own the reward and audio. The shared
    // transition supplies memory, heat, rumor and exactly one public reaction.
    events.push(...social.events.filter(entry => entry.type === 'publicReaction'));
  }
  return { state, events };
}

export function resolveFightMove(input, npcId, move, random = Math.random) {
  let state = clone(input);
  let npc = state.npcs[npcId];
  const fight = state.fight || { npcId, playerScore: 0, npcScore: 0, round: 0 };
  const events = [];
  const movePower = { snatch: 0.58, read: 0.66, flourish: 0.62 }[move] || 0.5;
  fight.round += 1;
  const success = random() < movePower;
  if (success) fight.playerScore += 1;
  else fight.npcScore += 1;
  events.push(event(move, success ? `${move.toUpperCase()}: devastatingly legible.` : `${move.toUpperCase()}: ${npc.name} was prepared, which feels targeted.`));
  state.lastIncident = { type: move, npcId, npcName: npc.name, text: `${state.player.name} used ${move.toUpperCase()} against ${npc.name}. ${events[0].text}` };
  state.fight = fight;
  if (fight.round >= 3) {
    const won = fight.playerScore >= fight.npcScore;
    if (won) {
      npc.losses += 1;
      const item = npcItem(state, npc);
      if (item && hasPurseRoom(state)) {
        state = transferPossession(state, item.id, npcId, 'player', `Won from ${npc.name} during an altercation at ${state.shore.name}.`).state;
        npc = state.npcs[npcId];
        npc.memories.push({ type: 'loss', itemId: item.id, itemName: item.name, text: `Lost ${item.name} in an altercation.` });
        events.push(event('victory', `You win ${item.name}. ${npc.name} will be revising this outcome privately.`, { itemId: item.id }));
      } else if (item) events.push(event('victory', `You win, but your full purse turns the spoils into a future grievance.`));
      else events.push(event('victory', `You win. ${npc.name} retains only her version of events.`));
      award(state, POINT_AWARDS.altercation, 'altercation', events);
    } else {
      npc.wins += 1;
      const item = playerAtRiskItem(state);
      if (item) {
        state = transferPossession(state, item.id, 'player', npcId, `Taken by ${npc.name} during an altercation at ${state.shore.name}.`).state;
        npc = state.npcs[npcId];
        events.push(event('loss', `${npc.name} takes ${item.name}. The recovery arc begins immediately.`, { itemId: item.id }));
      } else events.push(event('loss', `${npc.name} wins but finds your purse strategically barren.`));
      award(state, POINT_AWARDS.survivedEmbarrassment, 'survived embarrassment', events);
    }
    npc.rivalry += 2;
    state.lastIncident = { type: 'altercation', npcId, npcName: npc.name, won, text: won ? `${state.player.name} defeated ${npc.name} nonlethally.` : `${npc.name} embarrassed ${state.player.name} in open water.` };
    state.mode = 'ocean';
    state.fight = null;
    const social = recordIncident(state, { type: 'altercation', actorId: won ? 'player' : npcId, targetId: won ? npcId : 'player', itemId: events.find(entry => entry.itemId)?.itemId, text: state.lastIncident.text, public: true }, random);
    state = social.state;
    events.push(...social.events.filter(entry => entry.type === 'publicReaction'));
  }
  return { state, events };
}

export function returnHome(input) {
  const state = clone(input);
  state.mode = 'home';
  state.fight = null;
  state.purseIds = [];
  return { state, events: [event('home', 'Back in the grotto. Everything here is safe and nobody gets a vote.')] };
}

export function resumeOuting(input) {
  const state = clone(input);
  state.mode = 'ocean';
  resetCurrent(state);
  return { state, events: [event('enter', `You return to ${state.shore.name}. The Treasure Current has changed its mind.`)] };
}

export function advanceShore(input, random = Math.random) {
  const state = clone(input);
  state.progression.shores += 1;
  state.shore = generateShore(random, state.progression.level);
  state.mode = 'ocean';
  resetCurrent(state);
  ensureFinds(state, random);
  seedNpcPossessions(state, random);
  return { state, events: [event('enter', `${state.shore.name}. Fresh water, old patterns.`)] };
}
