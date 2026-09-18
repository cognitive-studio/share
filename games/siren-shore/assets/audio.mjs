const SCENE_GAIN = { home: 0.36, ocean: 0.55, encounter: 0.64, fight: 0.82 };
const EFFECTS = {
  enter: [196, 392, .34], find: [523, 784, .16], rareFind: [659, 1318, .38], equip: [440, 660, .12], pack: [220, 330, .1],
  compliment: [587, 880, .2], trade: [392, 523, .18], shade: [180, 118, .24], read: [240, 90, .3], snatch: [720, 210, .2],
  loss: [196, 82, .38], victory: [392, 988, .42], levelUp: [523, 1568, .55], home: [330, 220, .3], share: [659, 1047, .22],
  notice: [210, 180, .08], remix: [330, 880, .3], fight: [120, 90, .22], greet: [350, 420, .1], leave: [250, 220, .1],
};

export function createAudioController({
  audioContextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  audioFactory = () => new Audio(),
  soundtrackUrl,
  settings = { music: true, effects: true },
  onSettings = () => {},
} = {}) {
  let context = null;
  let musicGain = null;
  let effectsGain = null;
  let unlocked = false;
  let scene = 'home';
  let current = { music: settings.music !== false, effects: settings.effects !== false };
  const soundtrack = audioFactory();
  soundtrack.src = soundtrackUrl;
  soundtrack.loop = true;
  soundtrack.preload = 'auto';

  function ensureGraph() {
    if (context) return;
    context = audioContextFactory();
    musicGain = context.createGain();
    effectsGain = context.createGain();
    musicGain.gain.value = current.music ? SCENE_GAIN[scene] : 0;
    effectsGain.gain.value = current.effects ? .34 : 0;
    musicGain.connect(context.destination);
    effectsGain.connect(context.destination);
    try {
      const source = context.createMediaElementSource(soundtrack);
      source.connect(musicGain);
    } catch {
      soundtrack.volume = musicGain.gain.value;
    }
  }

  function persist() { onSettings({ ...current }); }

  async function unlock() {
    try {
      ensureGraph();
      await context.resume();
      if (current.music) await soundtrack.play();
      unlocked = true;
      return { ok: true, warning: null };
    } catch {
      unlocked = false;
      return { ok: false, warning: 'Sound was blocked. The game remains playable; try the music control again.' };
    }
  }

  function setMusicEnabled(enabled) {
    current.music = Boolean(enabled);
    if (context && musicGain) musicGain.gain.setTargetAtTime(current.music ? SCENE_GAIN[scene] : 0, context.currentTime, .05);
    soundtrack.volume = current.music ? SCENE_GAIN[scene] : 0;
    if (unlocked && current.music) soundtrack.play().catch(() => {});
    if (!current.music) soundtrack.pause();
    persist();
  }

  function setEffectsEnabled(enabled) {
    current.effects = Boolean(enabled);
    if (context && effectsGain) effectsGain.gain.setTargetAtTime(current.effects ? .34 : 0, context.currentTime, .03);
    persist();
  }

  function setScene(next) {
    scene = SCENE_GAIN[next] ? next : 'ocean';
    if (context && musicGain) musicGain.gain.setTargetAtTime(current.music ? SCENE_GAIN[scene] : 0, context.currentTime, .35);
    soundtrack.playbackRate = scene === 'fight' ? 1.035 : scene === 'encounter' ? 1.015 : 1;
  }

  function playEffect(name) {
    if (!unlocked || !current.effects || !context) return;
    const [start, end, duration] = EFFECTS[name] || EFFECTS.notice;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = name === 'shade' || name === 'read' ? 'sawtooth' : name === 'rareFind' || name === 'levelUp' ? 'triangle' : 'sine';
    oscillator.frequency.value = start;
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), context.currentTime + duration);
    filter.type = 'lowpass';filter.frequency.value = name === 'snatch' ? 950 : 2400;
    gain.gain.value = .0001;
    gain.gain.setTargetAtTime(.24, context.currentTime, .008);
    gain.gain.setTargetAtTime(.0001, context.currentTime + duration * .5, duration * .12);
    oscillator.connect(filter);filter.connect(gain);gain.connect(effectsGain);
    oscillator.start(context.currentTime);oscillator.stop(context.currentTime + duration + .08);
  }

  async function suspend() { if (context?.state === 'running') await context.suspend(); }
  async function resume() { if (unlocked && context?.state === 'suspended') await context.resume(); }
  function destroy() { soundtrack.pause();context?.close?.(); }
  return { unlock, setMusicEnabled, setEffectsEnabled, playEffect, setScene, suspend, resume, destroy };
}
