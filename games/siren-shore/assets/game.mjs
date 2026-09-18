import { PURSES, generateItem, generateShore } from './data.mjs';
import { levelForXp, nextId } from './state.mjs';

const clone = (value) => structuredClone(value);

function event(type, text, extra = {}) {
  return { type, text, ...extra };
}

function award(state, amount, reason, events) {
  const before = state.progression.level;
  state.progression.xp += amount;
  state.progression.level = levelForXp(state.progression.xp);
  if (state.progression.level > before) {
    state.player.title = titleForLevel(state.progression.level);
    events.push(event('levelUp', `Siren Level ${state.progression.level}. ${state.player.title}.`, { level: state.progression.level, reason }));
  }
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

export function createOuting(input, random = Math.random) {
  const state = clone(input);
  state.mode = 'ocean';
  state.player.x = 600;
  state.player.y = 500;
  ensureFinds(state, random);
  seedNpcPossessions(state, random);
  return { state, events: [event('enter', `You enter ${state.shore.name}. The ocean has already heard several versions of the story.`)] };
}

export function collectFind(input, findId) {
  const state = clone(input);
  const events = [];
  const find = state.shore.finds?.find(({ id }) => id === findId);
  if (!find || find.collected) return { state, events: [event('notice', 'There is nothing left here but implication.')] };
  if (!hasPurseRoom(state)) return { state, events: [event('notice', `${purse(state).name} is full. Return home, edit the bag, then come back for her.`)] };
  find.collected = true;
  const item = find.item;
  item.ownerId = 'player';
  item.history.push(`Claimed by ${state.player.name} at ${state.shore.name}.`);
  state.inventory.push(item);
  state.purseIds.push(item.id);
  state.progression.finds += 1;
  state.lastIncident = { type: 'find', itemId: item.id, itemName: item.name, shore: state.shore.name, text: `${state.player.name} found ${item.name}.` };
  events.push(event(item.rarity.includes('One') || item.rarity.includes('Museum') ? 'rareFind' : 'find', `${item.name}. Unfortunately, it is perfect.`, { itemId: item.id }));
  award(state, 20, 'find', events);
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
  award(state, 35, 'remix', events);
  return { state, events };
}

function npcItem(state, npc) {
  return npc.possessions.map((id) => state.inventory.find((item) => item.id === id)).find(Boolean);
}

function playerAtRiskItem(state) {
  const candidates = state.purseIds.map((id) => state.inventory.find((item) => item.id === id)).filter(Boolean);
  return candidates[0] || null;
}

function transfer(state, item, from, to, note) {
  item.ownerId = to;
  item.history.push(note);
  if (from !== 'player') state.npcs[from].possessions = state.npcs[from].possessions.filter((id) => id !== item.id);
  else {
    state.purseIds = state.purseIds.filter((id) => id !== item.id);
    clearEquippedItem(state, item.id);
  }
  if (to !== 'player') {
    if (!state.npcs[to].possessions.includes(item.id)) state.npcs[to].possessions.push(item.id);
  } else if (state.mode === 'ocean' || state.mode === 'fight') state.purseIds.push(item.id);
}

function rememberedObject(state, npc) {
  const worn = Object.values(state.equipped);
  return npc.memories.find((memory) => memory.itemId && worn.includes(memory.itemId));
}

export function resolveEncounter(input, npcId, action, random = Math.random) {
  const state = clone(input);
  const npc = state.npcs[npcId];
  if (!npc) return { state, events: [event('notice', 'That mermaid has left the jurisdiction.')] };
  const events = [];
  const memory = rememberedObject(state, npc);
  if (action === 'greet') {
    const text = memory ? `${npc.name} sees the ${memory.itemName}. “You are still wearing my ${memory.itemName.toLowerCase()}. I respect the stamina, not the decision.”` : `${npc.name}: “${npc.signatureRead}”`;
    return { state, events: [event('greet', text)] };
  }
  if (action === 'leave') return { state, events: [event('leave', 'You choose peace. This is not the same as forgiveness.')] };
  if (action === 'compliment') {
    npc.friendship += 2;
    npc.memories.push({ type: 'compliment', text: 'Received a surprisingly sincere compliment.' });
    award(state, 8, 'compliment', events);
    events.unshift(event('compliment', `${npc.name} accepts the compliment as her legal due.`));
  } else if (action === 'trade') {
    const theirs = npcItem(state, npc);
    const yours = playerAtRiskItem(state);
    if (theirs && yours) {
      transfer(state, yours, 'player', npcId, `Traded by ${state.player.name} to ${npc.name}.`);
      transfer(state, theirs, npcId, 'player', `Traded by ${npc.name} to ${state.player.name}.`);
      npc.friendship += 1;
      events.push(event('trade', `${npc.name} accepts the trade and immediately revises the story.`, { itemId: theirs.id }));
      award(state, 18, 'trade', events);
    } else events.push(event('notice', 'A trade requires each party to bring property and delusion.'));
  } else if (action === 'shade') {
    npc.rivalry += 1;
    npc.cattiness += 1;
    npc.memories.push({ type: 'shade', text: 'Was read in open water.' });
    state.progression.incidents += 1;
    state.lastIncident = { type: 'shade', npcId, npcName: npc.name, text: `${state.player.name} read ${npc.name} in open water.` };
    events.push(event('shade', `${npc.name}: “${npc.signatureRead}” You decline to be devastated.`));
    award(state, 12, 'shade', events);
  } else if (action === 'snatch') {
    const theirs = npcItem(state, npc);
    if (!theirs) events.push(event('notice', `${npc.name} has nothing available except an attitude.`));
    else if (!hasPurseRoom(state)) events.push(event('notice', 'Your purse is full. Even larceny requires editorship.'));
    else if (random() < 0.58) {
      transfer(state, theirs, npcId, 'player', `Snatched from ${npc.name} by ${state.player.name}.`);
      npc.rivalry += 4;
      npc.memories.push({ type: 'theft', itemId: theirs.id, itemName: theirs.name, text: `${state.player.name} stole ${theirs.name}.` });
      state.lastIncident = { type: 'snatch', itemId: theirs.id, itemName: theirs.name, npcId, npcName: npc.name, text: `${state.player.name} took ${theirs.name} from ${npc.name}.` };
      events.push(event('snatch', `Property changed hands. ${npc.name} is constructing a narrative.`, { itemId: theirs.id }));
      award(state, 30, 'snatch', events);
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
  return { state, events };
}

export function resolveFightMove(input, npcId, move, random = Math.random) {
  const state = clone(input);
  const npc = state.npcs[npcId];
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
        transfer(state, item, npcId, 'player', `Won from ${npc.name} during an altercation at ${state.shore.name}.`);
        npc.memories.push({ type: 'loss', itemId: item.id, itemName: item.name, text: `Lost ${item.name} in an altercation.` });
        events.push(event('victory', `You win ${item.name}. ${npc.name} will be revising this outcome privately.`, { itemId: item.id }));
      } else if (item) events.push(event('victory', `You win, but your full purse turns the spoils into a future grievance.`));
      else events.push(event('victory', `You win. ${npc.name} retains only her version of events.`));
      award(state, 45, 'altercation', events);
    } else {
      npc.wins += 1;
      const item = playerAtRiskItem(state);
      if (item) {
        transfer(state, item, 'player', npcId, `Taken by ${npc.name} during an altercation at ${state.shore.name}.`);
        events.push(event('loss', `${npc.name} takes ${item.name}. The recovery arc begins immediately.`, { itemId: item.id }));
      } else events.push(event('loss', `${npc.name} wins but finds your purse strategically barren.`));
      award(state, 12, 'survived embarrassment', events);
    }
    npc.rivalry += 2;
    state.progression.incidents += 1;
    state.lastIncident = { type: 'altercation', npcId, npcName: npc.name, won, text: won ? `${state.player.name} defeated ${npc.name} nonlethally.` : `${npc.name} embarrassed ${state.player.name} in open water.` };
    state.mode = 'ocean';
    state.fight = null;
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

export function advanceShore(input, random = Math.random) {
  const state = clone(input);
  state.progression.shores += 1;
  state.shore = generateShore(random, state.progression.level);
  state.mode = 'ocean';
  ensureFinds(state, random);
  seedNpcPossessions(state, random);
  return { state, events: [event('enter', `${state.shore.name}. Fresh water, old patterns.`)] };
}
