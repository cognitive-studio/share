const CONDITIONS = ['haunted', 'emotionally unavailable', 'recently annulled', 'suspiciously damp', 'ceremonial', 'counterfeit', 'divorce-adjacent', 'unlicensed', 'gently cursed', 'aggressively heirloom', 'tax-deductible', 'socially radioactive', 'estate-sale', 'petty', 'baroque', 'unauthorized', 'municipal', 'vengeful', 'sentient-looking', 'regrettably iconic', 'post-scandal', 'uninsurable', 'discontinued'];
const MATERIALS = ['pearl', 'rhinestone', 'coral', 'chrome', 'velvet', 'sea-glass', 'mother-of-pearl', 'lucite', 'gold-plated', 'barnacle', 'satin', 'kelp-silk', 'obsidian', 'plastic', 'silver', 'abalone', 'sequin', 'ivory-toned', 'copper', 'marabou', 'crystal', 'shellac'];
const ATTITUDES = ['aristocratic', 'litigious', 'devotional', 'provincial', 'operatic', 'passive-aggressive', 'continental', 'widowed', 'after-hours', 'competitive', 'editorial', 'revenge', 'suburban', 'mysterious', 'administrative', 'forbidden', 'award-season', 'poolside', 'unionized', 'apocalyptic', 'debutante', 'deeply personal'];
const OBJECTS = [
  ['tiara', 'crown'], ['salad fork', 'weapon'], ['handbag', 'purse'], ['opera glove', 'glove'], ['compact mirror', 'makeup'], ['anklet', 'jewelry'], ['ashtray', 'treasure'], ['wiglet', 'hair'], ['brooch', 'jewelry'], ['letter opener', 'weapon'], ['chandelier earring', 'jewelry'], ['pool sandal', 'shoe'], ['gravy boat', 'treasure'], ['veil', 'hair'], ['fan', 'weapon'], ['cigarette case', 'treasure'], ['goblet', 'treasure'], ['pageant sash', 'clothing'], ['clam clutch', 'purse'], ['martini pick', 'weapon'], ['opera cape', 'clothing'], ['false eyelash', 'makeup'], ['signet ring', 'jewelry'], ['hotel key', 'treasure'], ['mourning bonnet', 'hair'], ['champagne sabre', 'weapon'], ['corsage', 'jewelry'], ['monogrammed flask', 'treasure'], ['court shoe', 'shoe'], ['sea-witch coupon', 'treasure'],
];
const RARITIES = ['Foundational', 'Interesting', 'Questionable', 'Important to Her', 'Museum Dispute', 'One of One Apparently'];
const PALETTES = [
  ['#42e8d4', '#fb57b9', '#ffe8b6'], ['#7868ff', '#34d5ff', '#f8c5ff'], ['#ff865f', '#ffd95e', '#9d39ff'], ['#1bd2a4', '#0a6b87', '#f56fae'], ['#e5b8ff', '#6d5ce8', '#ffefcb'],
];

export const NPC_DEFINITIONS = Object.freeze([
  { id: 'cynthia', name: 'Cynthia Undertow', signatureRead: 'That look has municipal funding.', temperament: 'territorial', preference: 'crown', palette: ['#f04b9b', '#5f2a86', '#ffd6ef'] },
  { id: 'marina', name: 'Marina Del Rey', signatureRead: 'I love that you committed before checking a mirror.', temperament: 'social', preference: 'purse', palette: ['#27d8cf', '#186f9d', '#ffeaa8'] },
  { id: 'beatrice', name: 'Beatrice Below', signatureRead: 'It is brave to make provenance everyone’s problem.', temperament: 'archival', preference: 'treasure', palette: ['#7b62d3', '#312657', '#f9bde8'] },
  { id: 'dutchess', name: 'Dutchess Current', signatureRead: 'Darling, rarity and scarcity are not the same thing.', temperament: 'imperial', preference: 'jewelry', palette: ['#ffbf47', '#cf4f5f', '#41205f'] },
  { id: 'opal', name: 'Opal Situation', signatureRead: 'Your silhouette has filed for separation.', temperament: 'volatile', preference: 'clothing', palette: ['#f2efff', '#63d0ff', '#d55eff'] },
  { id: 'kelp', name: 'Kelp! with an Exclamation Point', signatureRead: 'I support whatever emergency this is.', temperament: 'chaotic', preference: 'weapon', palette: ['#89e06d', '#0d8f81', '#ff4f9a'] },
  { id: 'loretta', name: 'Loretta Tidewater', signatureRead: 'That belonged to someone with better posture.', temperament: 'grand', preference: 'hair', palette: ['#ff6f61', '#861657', '#ffd1a1'] },
  { id: 'pearl', name: 'Pearl Necklace', signatureRead: 'No relation to the jewelry, and frankly no resemblance.', temperament: 'deadpan', preference: 'makeup', palette: ['#d9f7ff', '#4a7fb8', '#201a4b'] },
]);

const pick = (array, random) => array[Math.floor(random() * array.length) % array.length];
const title = (value) => value.replace(/(^|[-\s])\w/g, (letter) => letter.toUpperCase());

export function generateItem(random = Math.random, context = {}) {
  let seed = Math.max(1, Math.floor(random() * 2147483646));
  const roll = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const condition = pick(CONDITIONS, roll);
  const material = pick(MATERIALS, roll);
  const attitude = pick(ATTITUDES, roll);
  const [object, slot] = pick(OBJECTS, roll);
  const rarity = pick(RARITIES, roll);
  const colors = pick(PALETTES, roll);
  const shoreName = context.shoreName || 'an unnamed but judgmental shoal';
  const name = title(`${condition} ${material} ${attitude} ${object}`);
  return {
    id: context.id || `item-${Math.floor(roll() * 1e12).toString(36)}`,
    name,
    description: `A ${object} with ${attitude} energy. It looks ${condition}, which is none of your business.`,
    category: slot === 'treasure' ? 'Find' : 'Adornment',
    slot,
    rarity,
    colors: [...colors],
    ownerId: context.ownerId ?? null,
    origin: `Discovered at ${shoreName}.`,
    history: [],
    parents: [],
  };
}

const SHORE_FIRST = ['Tax-Deductible', 'Champagne', 'Unsupervised', 'Widow’s', 'Municipal', 'After-Hours', 'Disputed', 'Velvet', 'Unbothered', 'Litigious'];
const SHORE_LAST = ['Trench', 'Shoal', 'Grotto', 'Escarpment', 'Lagoon', 'Drop-Off', 'Reef', 'Shelf', 'Current', 'Abyss'];

export function generateShore(random = Math.random, level = 1) {
  return {
    id: `shore-${Math.floor(random() * 1e12).toString(36)}`,
    name: `The ${pick(SHORE_FIRST, random)} ${pick(SHORE_LAST, random)}`,
    level,
    mood: pick(['serene', 'suspicious', 'overdressed', 'legally complicated', 'electric'], random),
    palette: [...pick(PALETTES, random)],
    findCount: 8 + Math.min(16, Math.floor(Math.log2(Math.max(1, level) + 1))),
  };
}

export const PURSES = Object.freeze([
  { id: 'clam', name: 'Tiny Clam Clutch', capacity: 3 },
  { id: 'weekender', name: 'Questionable Weekender', capacity: 6 },
  { id: 'estate', name: 'Estate Litigation Tote', capacity: 10 },
]);

export const HAIR_STYLES = Object.freeze(['Cathedral Bouffant', 'Wet-Look Verdict', 'Executive Kelp', 'Pageant Storm', 'Severe Pearl Bob', 'Unlicensed Beehive']);
export const TAIL_STYLES = Object.freeze(['Cobalt Scandal', 'Radioactive Coral', 'Widow Purple', 'Champagne Kelp', 'Chrome Divorce']);
export const MAKEUP_STYLES = Object.freeze(['Editorial Mourning', 'Poolside Revenge', 'Municipal Glamour', 'Pearl Emergency', 'No Comment']);
export const SCALE_STYLES = Object.freeze(['Champagne Chevron', 'Disco Verdict', 'Oil-Slick Inheritance', 'Pearlescent Alibi', 'Radioactive Ombré']);
export const FIN_STYLES = Object.freeze(['Cathedral Fan', 'Executive Ruffle', 'Widow’s Wing', 'Municipal Spikes', 'Soft Launch Frill']);
