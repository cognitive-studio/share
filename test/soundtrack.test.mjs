import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const soundtrack = resolve(import.meta.dirname, '../quizzes/youre-next-survival/assets/house-score.mp3');

test('the survival game ships a substantial original soundtrack asset', () => {
  assert.equal(existsSync(soundtrack), true, 'house-score.mp3 is missing');
  assert.ok(statSync(soundtrack).size > 700_000, 'soundtrack is too small to contain the full cinematic cue');
});

test('the soundtrack is a browser-ready stereo cue between sixty and ninety seconds', () => {
  const metadata = JSON.parse(execFileSync('ffprobe', [
    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', soundtrack,
  ], { encoding: 'utf8' }));
  const stream = metadata.streams.find((item) => item.codec_type === 'audio');
  const duration = Number(metadata.format.duration);
  assert.equal(stream.codec_name, 'mp3');
  assert.equal(stream.channels, 2);
  assert.ok(Number(stream.sample_rate) >= 44_100);
  assert.ok(duration >= 60 && duration <= 90, `unexpected duration: ${duration}`);
});
