const MAX_SCENE = 7;
const OPENING_MIX = Object.freeze({
  masterGain: 0.32,
  droneGain: 0.045,
  lowDroneFrequency: 36.71,
  audibleDroneFrequency: 103.83,
  pulseGain: 0.035,
});
const MASTER_LEVEL = OPENING_MIX.masterGain;
const TEST_SIGNAL = Object.freeze({
  frequencies: Object.freeze([440, 330, 220]),
  gain: 0.18,
  duration: 1.05,
});

export function openingMixProfile() {
  return {
    ...OPENING_MIX,
    effectiveDroneGain: Number((OPENING_MIX.masterGain * OPENING_MIX.droneGain).toFixed(4)),
  };
}

export function testSignalProfile() {
  return {
    frequencies: [...TEST_SIGNAL.frequencies],
    gain: TEST_SIGNAL.gain,
    duration: TEST_SIGNAL.duration,
  };
}

export function scoreProfileForScene(sceneProgress) {
  const numeric = Number(sceneProgress);
  const safe = Number.isFinite(numeric) ? Math.min(MAX_SCENE, Math.max(0, numeric)) : 0;
  const intensity = Number((0.12 + (safe / MAX_SCENE) * 0.88).toFixed(2));
  return {
    intensity,
    filterFrequency: Math.round(115 + safe * 31),
    pulseRate: Number((0.17 + safe * 0.035).toFixed(3)),
    dissonance: Number((0.003 + safe * 0.0026).toFixed(4)),
    noise: Number((0.006 + safe * 0.0017).toFixed(4)),
  };
}

export function soundtrackProfileForScene(sceneProgress) {
  const numeric = Number(sceneProgress);
  const safe = Number.isFinite(numeric) ? Math.min(MAX_SCENE, Math.max(0, numeric)) : 0;
  return {
    volume: Number((0.34 + (safe / MAX_SCENE) * 0.18).toFixed(3)),
    playbackRate: Number((0.98 + (safe / MAX_SCENE) * 0.07).toFixed(3)),
  };
}

const endingProfiles = {
  'baptised-by-fire': { mode: 'controlled-triumph', fadeSeconds: 5.5, finalFrequency: 73.42 },
  'did-not-make-it': { mode: 'hard-cut', fadeSeconds: 0.12, finalFrequency: null },
  'everyone-dies': { mode: 'last-note', fadeSeconds: 1.8, finalFrequency: 110 },
};

const survivedEnding = { mode: 'survived', fadeSeconds: 6, finalFrequency: 55 };

export function endingProfile(slug) {
  return endingProfiles[slug] ?? survivedEnding;
}

export function normalizeSoundPreference(value) {
  return value === 'off' ? false : true;
}

function defaultAudioContext() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

function defaultAudioElement() {
  if (typeof window === 'undefined') return null;
  return window.Audio ?? null;
}

function setValue(parameter, value, now, duration = 0.8) {
  parameter.cancelScheduledValues(now);
  parameter.setValueAtTime(Math.max(0.0001, parameter.value || 0.0001), now);
  parameter.exponentialRampToValueAtTime(Math.max(0.0001, value), now + duration);
}

function createNoiseBuffer(context) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) channel[index] = Math.random() * 2 - 1;
  return buffer;
}

export function createOminousScore({
  AudioContextCtor = defaultAudioContext(),
  AudioCtor = defaultAudioElement(),
  soundtrackUrl = null,
  enabled = true,
} = {}) {
  let context = null;
  let nodes = null;
  let soundtrack = null;
  let started = false;
  let destroyed = false;
  let soundEnabled = Boolean(enabled);
  let profile = scoreProfileForScene(0);
  let soundtrackProfile = soundtrackProfileForScene(0);

  function buildSoundtrack() {
    if (!AudioCtor || !soundtrackUrl || soundtrack) return;
    soundtrack = new AudioCtor(soundtrackUrl);
    soundtrack.loop = true;
    soundtrack.preload = 'auto';
    soundtrack.volume = soundtrackProfile.volume;
    soundtrack.playbackRate = soundtrackProfile.playbackRate;
  }

  function buildGraph() {
    context = new AudioContextCtor();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const filter = context.createBiquadFilter();
    const droneGain = context.createGain();
    const dissonanceGain = context.createGain();
    const pulseGain = context.createGain();
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();
    const droneA = context.createOscillator();
    const droneB = context.createOscillator();
    const dissonance = context.createOscillator();
    const pulse = context.createOscillator();
    const pulseLfo = context.createOscillator();
    const pulseDepth = context.createGain();
    const noise = context.createBufferSource();

    master.gain.value = 0.0001;
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.05;
    compressor.release.value = 0.8;
    filter.type = 'lowpass';
    filter.frequency.value = profile.filterFrequency;
    filter.Q.value = 4.5;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 240;
    noiseFilter.Q.value = 0.7;

    droneA.type = 'sine';
    droneA.frequency.value = OPENING_MIX.lowDroneFrequency;
    droneB.type = 'sawtooth';
    droneB.frequency.value = OPENING_MIX.audibleDroneFrequency;
    droneB.detune.value = -7;
    dissonance.type = 'triangle';
    dissonance.frequency.value = 74.2;
    pulse.type = 'sine';
    pulse.frequency.value = 27.5;
    pulseLfo.type = 'sine';
    pulseLfo.frequency.value = profile.pulseRate;

    droneGain.gain.value = OPENING_MIX.droneGain;
    dissonanceGain.gain.value = profile.dissonance;
    pulseGain.gain.value = OPENING_MIX.pulseGain;
    pulseDepth.gain.value = 0.008;
    noiseGain.gain.value = profile.noise;
    noise.buffer = createNoiseBuffer(context);
    noise.loop = true;

    droneA.connect(droneGain);
    droneB.connect(droneGain);
    dissonance.connect(dissonanceGain);
    droneGain.connect(filter);
    dissonanceGain.connect(filter);
    pulse.connect(pulseGain);
    pulseLfo.connect(pulseDepth);
    pulseDepth.connect(pulseGain.gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    filter.connect(master);
    pulseGain.connect(master);
    noiseGain.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);

    [droneA, droneB, dissonance, pulse, pulseLfo, noise].forEach((source) => source.start());
    nodes = { master, filter, droneGain, dissonanceGain, pulseGain, noiseGain, droneA, droneB, dissonance, pulse, pulseLfo, pulseDepth, noise, compressor };
  }

  async function start() {
    if (destroyed || !soundEnabled || started || !AudioContextCtor) return false;
    buildGraph();
    buildSoundtrack();
    started = true;
    const soundtrackPlayback = soundtrack ? soundtrack.play().catch(() => false) : Promise.resolve(false);
    if (context.state === 'suspended') await context.resume();
    setValue(nodes.master.gain, MASTER_LEVEL, context.currentTime, 2.6);
    await soundtrackPlayback;
    return true;
  }

  function setScene(sceneProgress) {
    profile = scoreProfileForScene(sceneProgress);
    soundtrackProfile = soundtrackProfileForScene(sceneProgress);
    if (!started || destroyed) return profile;
    const now = context.currentTime;
    setValue(nodes.filter.frequency, profile.filterFrequency, now, 1.3);
    setValue(nodes.dissonanceGain.gain, profile.dissonance, now, 1.1);
    setValue(nodes.noiseGain.gain, profile.noise, now, 1.1);
    setValue(nodes.pulseLfo.frequency, profile.pulseRate, now, 1.4);
    setValue(nodes.pulseDepth.gain, 0.007 + profile.intensity * 0.009, now, 1.2);
    if (soundtrack) {
      soundtrack.volume = soundtrackProfile.volume;
      soundtrack.playbackRate = soundtrackProfile.playbackRate;
    }
    return profile;
  }

  function impact() {
    if (!started || !soundEnabled || destroyed || context.state !== 'running') return;
    const now = context.currentTime;
    const hit = context.createOscillator();
    const hitGain = context.createGain();
    const metal = context.createOscillator();
    const metalGain = context.createGain();
    hit.type = 'sine';
    hit.frequency.setValueAtTime(58, now);
    hit.frequency.exponentialRampToValueAtTime(31, now + 0.7);
    hitGain.gain.setValueAtTime(0.09, now);
    hitGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    metal.type = 'triangle';
    metal.frequency.setValueAtTime(173, now);
    metal.frequency.exponentialRampToValueAtTime(91, now + 0.45);
    metalGain.gain.setValueAtTime(0.018, now);
    metalGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    hit.connect(hitGain).connect(nodes.compressor);
    metal.connect(metalGain).connect(nodes.compressor);
    hit.start(now);
    metal.start(now);
    hit.stop(now + 0.9);
    metal.stop(now + 0.6);
  }

  async function testSound() {
    if (destroyed || !soundEnabled || !AudioContextCtor) {
      return { played: false, state: soundEnabled ? 'unavailable' : 'disabled' };
    }
    if (!started) await start();
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') return { played: false, state: context.state };

    const startAt = context.currentTime + 0.03;
    TEST_SIGNAL.frequencies.forEach((frequency, index) => {
      const tone = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + index * 0.32;
      const toneEnd = toneStart + 0.28;
      tone.type = 'sine';
      tone.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(TEST_SIGNAL.gain, toneStart + 0.035);
      gain.gain.setValueAtTime(TEST_SIGNAL.gain, toneEnd - 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
      tone.connect(gain).connect(context.destination);
      tone.start(toneStart);
      tone.stop(toneEnd + 0.02);
    });
    return { played: true, state: context.state };
  }

  function endingTone(frequency, startDelay = 0, duration = 5, direct = false) {
    if (!frequency || !started || destroyed) return;
    const now = context.currentTime + startDelay;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.026, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    tone.connect(gain).connect(direct ? context.destination : nodes.compressor);
    tone.start(now);
    tone.stop(now + duration + 0.1);
  }

  function end(slug) {
    const ending = endingProfile(slug);
    if (!started || destroyed) return ending;
    const now = context.currentTime;
    if (ending.mode === 'hard-cut') {
      setValue(nodes.master.gain, 0.0001, now, ending.fadeSeconds);
      if (soundtrack) { soundtrack.pause(); soundtrack.currentTime = 0; }
      return ending;
    }
    if (ending.mode === 'last-note') {
      setValue(nodes.master.gain, 0.0001, now, ending.fadeSeconds);
      if (soundtrack) soundtrack.volume = 0.08;
      endingTone(ending.finalFrequency, ending.fadeSeconds + 0.35, 6.5, true);
      return ending;
    }
    setValue(nodes.dissonanceGain.gain, 0.0001, now, 2.2);
    setValue(nodes.noiseGain.gain, 0.0001, now, 2.8);
    setValue(nodes.filter.frequency, ending.mode === 'controlled-triumph' ? 520 : 300, now, 2.4);
    setValue(nodes.master.gain, ending.mode === 'controlled-triumph' ? 0.24 : 0.14, now, 2.4);
    if (soundtrack) soundtrack.volume = ending.mode === 'controlled-triumph' ? 0.32 : 0.18;
    endingTone(ending.finalFrequency, 0.3, ending.fadeSeconds);
    return ending;
  }

  async function setEnabled(nextEnabled) {
    soundEnabled = Boolean(nextEnabled);
    if (!started || destroyed) return soundEnabled;
    if (soundEnabled) {
      await context.resume();
      setValue(nodes.master.gain, MASTER_LEVEL, context.currentTime, 0.45);
      if (soundtrack) await soundtrack.play().catch(() => false);
    } else {
      nodes.master.gain.cancelScheduledValues(context.currentTime);
      nodes.master.gain.setValueAtTime(0.0001, context.currentTime);
      if (soundtrack) soundtrack.pause();
      await context.suspend();
    }
    return soundEnabled;
  }

  async function pause() {
    if (soundtrack) soundtrack.pause();
    if (started && !destroyed && context.state === 'running') await context.suspend();
  }

  async function resume() {
    if (started && !destroyed && soundEnabled && context.state === 'suspended') {
      await context.resume();
      if (soundtrack) await soundtrack.play().catch(() => false);
    }
  }

  function reset() {
    profile = scoreProfileForScene(0);
    soundtrackProfile = soundtrackProfileForScene(0);
    if (!started || destroyed) return profile;
    const now = context.currentTime;
    setValue(nodes.master.gain, MASTER_LEVEL, now, 1.2);
    setValue(nodes.dissonanceGain.gain, profile.dissonance, now, 1.1);
    setValue(nodes.noiseGain.gain, profile.noise, now, 1.1);
    setValue(nodes.filter.frequency, profile.filterFrequency, now, 1.1);
    setValue(nodes.pulseLfo.frequency, profile.pulseRate, now, 1.1);
    if (soundtrack) {
      soundtrack.currentTime = 0;
      soundtrack.volume = soundtrackProfile.volume;
      soundtrack.playbackRate = soundtrackProfile.playbackRate;
      if (soundEnabled) soundtrack.play().catch(() => false);
    }
    return profile;
  }

  async function destroy() {
    if (!started || destroyed) return;
    destroyed = true;
    if (soundtrack) {
      soundtrack.pause();
      soundtrack.removeAttribute?.('src');
      soundtrack.load?.();
    }
    Object.values(nodes).forEach((node) => {
      if (typeof node.stop === 'function') {
        try { node.stop(); } catch { /* already stopped */ }
      }
    });
    await context.close();
  }

  return {
    start,
    setScene,
    impact,
    testSound,
    end,
    setEnabled,
    pause,
    resume,
    reset,
    destroy,
    isStarted: () => started,
    isEnabled: () => soundEnabled,
    currentProfile: () => profile,
  };
}
