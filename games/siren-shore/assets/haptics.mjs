const PATTERNS = Object.freeze({
  pickup: [10],
  rarePickup: [18, 24, 34],
  rushStart: [16, 18, 26],
  rushSummary: [12, 22, 18],
  swellWarning: [8, 26, 8],
  swellStart: [26, 16, 20],
  theft: [28, 18, 12],
  recovery: [12, 18, 28],
  legendary: [26, 30, 46],
  comboResolved: [10, 12, 18],
});

function feedbackType(event = {}) {
  if ((event.type === 'pickup' || event.type === 'rarePickup') && event.recovery) return 'recovery';
  if (event.type === 'rarePickup' && (event.tier === 'legendary' || event.rarity === 'legendary')) return 'legendary';
  if (event.type === 'npcTheft' || event.type === 'loss') return 'theft';
  return PATTERNS[event.type] ? event.type : null;
}

export function createHapticsController({
  vibrate = globalThis.navigator?.vibrate?.bind(globalThis.navigator),
  enabled = true,
  interacted = true,
} = {}) {
  let active = Boolean(enabled);
  let allowed = Boolean(interacted);

  function activate() { allowed = true; }
  function setEnabled(next) { active = Boolean(next); }
  function consumeEvent(event) {
    const type = feedbackType(event);
    if (!active || !allowed || !type || typeof vibrate !== 'function') return false;
    try { return Boolean(vibrate(PATTERNS[type])); } catch { return false; }
  }

  return { activate, setEnabled, consumeEvent };
}
