import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createAudioController } from '../games/siren-shore/assets/audio.mjs';
import { collectCurrentEntity } from '../games/siren-shore/assets/current.mjs';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';

function fakeContext() {
  const calls = [];
  const gain = () => ({ gain: { value: 1, setTargetAtTime(value) { this.value = value; calls.push(['gain', value]); } }, connect() {} });
  return {
    state: 'suspended', currentTime: 0, destination: {}, calls,
    resume() { this.state = 'running';calls.push(['resume']);return Promise.resolve(); },
    suspend() { this.state = 'suspended';calls.push(['suspend']);return Promise.resolve(); },
    close() { calls.push(['close']);return Promise.resolve(); },
    createGain: gain,
    createMediaElementSource() { return { connect() {} }; },
    createOscillator() { let value = 0; return { type: 'sine', frequency: { get value() { return value; }, set value(next) { value = next;calls.push(['frequency', next]); }, exponentialRampToValueAtTime() {} }, connect() {}, start() { calls.push(['oscillator']); }, stop() {} }; },
    createBiquadFilter() { return { type: 'lowpass', frequency: { value: 0 }, connect() {} }; },
  };
}

function fakeTrack({ reject = false } = {}) {
  return { loop: false, preload: '', plays: 0, pauses: 0, currentTime: 0,
    play() { this.plays += 1;return reject ? Promise.reject(new Error('blocked')) : Promise.resolve(); },
    pause() { this.pauses += 1; },
  };
}

test('audio never starts before explicit unlock', () => {
  const track = fakeTrack();
  createAudioController({ audioContextFactory: fakeContext, audioFactory: () => track, soundtrackUrl: 'score.mp3', settings: { music: true, effects: true } });
  assert.equal(track.plays, 0);
});

test('unlock starts enabled music and scene mixing changes gain', async () => {
  const track = fakeTrack();
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: () => track, soundtrackUrl: 'score.mp3', settings: { music: true, effects: true } });
  const result = await audio.unlock();
  assert.equal(result.ok, true);
  assert.equal(track.plays, 1);
  audio.setScene('fight');
  assert.ok(context.calls.some(([type, value]) => type === 'gain' && value >= 0.7));
});

test('music and effects toggle independently and persist', async () => {
  const settings = [];
  const track = fakeTrack();
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: () => track, soundtrackUrl: 'score.mp3', settings: { music: true, effects: true }, onSettings: (value) => settings.push(value) });
  await audio.unlock();
  audio.setMusicEnabled(false);
  const before = context.calls.filter(([type]) => type === 'oscillator').length;
  audio.playEffect('find');
  assert.ok(context.calls.filter(([type]) => type === 'oscillator').length > before);
  audio.setEffectsEnabled(false);
  const muted = context.calls.filter(([type]) => type === 'oscillator').length;
  audio.playEffect('find');
  assert.equal(context.calls.filter(([type]) => type === 'oscillator').length, muted);
  assert.deepEqual(settings.at(-1), { music: false, effects: false });
});

test('a pursuit uses its own ascending arrival cue', async () => {
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: fakeTrack, soundtrackUrl: 'score.mp3' });
  await audio.unlock();
  audio.playEffect('pursuit');
  assert.ok(context.calls.some(([type, value]) => type === 'frequency' && value === 92));
});

test('blocked audio reports a nonblocking result', async () => {
  const audio = createAudioController({ audioContextFactory: fakeContext, audioFactory: () => fakeTrack({ reject: true }), soundtrackUrl: 'score.mp3', settings: { music: true, effects: true } });
  const result = await audio.unlock();
  assert.equal(result.ok, false);
  assert.match(result.warning, /sound/i);
});

test('a blocked unlock remains retryable from a later user gesture', async () => {
  const context = fakeContext();
  let attempts = 0;
  context.resume = function resume() {
    attempts += 1;
    if (attempts === 1) return Promise.reject(new Error('policy'));
    this.state = 'running';
    return Promise.resolve();
  };
  const track = fakeTrack();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: () => track, soundtrackUrl: 'score.mp3' });
  assert.equal((await audio.unlock()).ok, false);
  assert.equal((await audio.unlock()).ok, true);
  assert.equal(track.plays, 1);
});

test('pickup pitch rises with the bounded combo ladder and varies by category', async () => {
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: fakeTrack, soundtrackUrl: 'score.mp3' });
  await audio.unlock();
  audio.playPickup({ category: 'coin', combo: 1, rarity: 'Interesting' });
  audio.playPickup({ category: 'coin', combo: 40, rarity: 'Interesting' });
  audio.playPickup({ category: 'pearl', combo: 1, rarity: 'Interesting' });
  const frequencies = context.calls.filter(([type]) => type === 'frequency').map(([, value]) => value);
  assert.ok(frequencies[1] > frequencies[0], 'combo pitch should climb but stop at its octave ceiling');
  assert.notEqual(frequencies[2], frequencies[0], 'different treasure categories should not all sound alike');
  assert.ok(frequencies[1] <= frequencies[0] * 2, 'the ladder must remain within one octave');
});

test('audio consumes live Current and rivalry events with distinct feedback', async () => {
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: fakeTrack, soundtrackUrl: 'score.mp3' });
  await audio.unlock();
  for (const event of [
    { type: 'rushStart' }, { type: 'rushSummary' }, { type: 'swellWarning' }, { type: 'swellStart' },
    { type: 'npcTheft' }, { type: 'recovery' }, { type: 'rarePickup', category: 'jewel', combo: 3, tier: 'legendary', rarity: 'Museum Dispute' },
    { type: 'comboResolved', combo: { count: 3 } },
  ]) audio.consumeEvent(event);
  const frequencies = context.calls.filter(([type]) => type === 'frequency').map(([, value]) => value);
  assert.ok(new Set(frequencies).size >= 7, 'each event class needs an audibly distinct cue');
});

function currentPickup(points) {
  const state = createDefaultState(() => .2);
  state.mode = 'ocean';
  state.current.entities = [{
    id: `current-${points}`, kind: 'treasure', archetypeId: 'coin', shape: 'coin', chain: 'gold', points, actionable: true,
    item: { id: `item-${points}`, name: 'Municipal Gold Coin', slot: 'treasure', rarity: 'Interesting', ownerId: null, history: [] },
  }];
  return collectCurrentEntity(state, `current-${points}`).events;
}

test('one-point and 4,006-point Current pickups have one authoritative pickup note', async () => {
  for (const points of [1, 4006]) {
    const context = fakeContext();
    const audio = createAudioController({ audioContextFactory: () => context, audioFactory: fakeTrack, soundtrackUrl: 'score.mp3' });
    await audio.unlock();
    const events = currentPickup(points);
    assert.deepEqual(events.map(({ type }) => type), points === 4006
      ? ['pickup', 'levelUp', 'pointAward', 'combo']
      : ['pickup', 'pointAward', 'combo']);
    assert.ok(events.some(({ type }) => type === 'pointAward'));
    assert.ok(events.some(({ type }) => type === 'combo'));
    audio.consumeEvents(events);
    assert.equal(context.calls.filter(([type]) => type === 'oscillator').length, 1, `${points}-point pickup must not turn its bookkeeping into extra notes`);
  }
});

test('ordinary point awards and combo bookkeeping are silent while combo resolution remains consonant', async () => {
  const context = fakeContext();
  const audio = createAudioController({ audioContextFactory: () => context, audioFactory: fakeTrack, soundtrackUrl: 'score.mp3' });
  await audio.unlock();
  audio.consumeEvent({ type: 'pointAward', amount: 4006 });
  audio.consumeEvent({ type: 'combo', combo: { count: 3 } });
  assert.equal(context.calls.filter(([type]) => type === 'oscillator').length, 0);
  audio.consumeEvent({ type: 'comboResolved', combo: { count: 3 } });
  assert.equal(context.calls.filter(([type]) => type === 'oscillator').length, 3);
});

test('Siren Shore ships a substantial original stereo score', () => {
  const score = resolve(import.meta.dirname, '../games/siren-shore/assets/siren-score.mp3');
  assert.equal(existsSync(score), true, 'siren-score.mp3 is missing');
  assert.ok(statSync(score).size > 500_000, 'score is too small to be a full musical cue');
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', score], { encoding: 'utf8' }));
  const stream = metadata.streams.find(({ codec_type }) => codec_type === 'audio');
  const duration = Number(metadata.format.duration);
  assert.equal(stream.codec_name, 'mp3');
  assert.equal(stream.channels, 2);
  assert.ok(duration >= 90 && duration <= 120, `unexpected duration: ${duration}`);
});
