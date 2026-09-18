import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Siren Shore entrypoint is a phone-first semantic game shell', () => {
  const html = read('games/siren-shore/index.html');
  assert.match(html, /viewport-fit=cover/);
  for (const id of ['ocean-canvas', 'move-pad', 'action-button', 'hud', 'toast', 'receipt-offer', 'home-sheet', 'encounter-sheet', 'inventory-sheet', 'settings-sheet', 'share-sheet', 'music-toggle', 'effects-toggle', 'scale-select', 'fin-select', 'skip-audio']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /<button[^>]+id=["']action-button["']/);
  assert.match(html, /type=["']module["'][^>]+src=["']\.\/assets\/app\.mjs["']/);
});

test('mobile visual system honors thumbs, safe areas, and reduced motion', () => {
  const css = read('games/siren-shore/assets/styles.css');
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /touch-action:\s*none/);
});

test('every local Siren Shore reference resolves', () => {
  const page = 'games/siren-shore/index.html';
  const html = read(page);
  const references = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith('./') || value.startsWith('../'));
  for (const reference of references) {
    const clean = reference.split(/[?#]/)[0];
    assert.equal(existsSync(resolve(root, dirname(page), clean)), true, `${page} -> ${reference}`);
  }
});

test('game modules wire rendering, touch, keyboard, resizing, audio, and receipts', () => {
  const app = read('games/siren-shore/assets/app.mjs');
  assert.match(app, /from ['"]\.\/render\.mjs['"]/);
  assert.match(app, /from ['"]\.\/game\.mjs['"]/);
  assert.match(app, /from ['"]\.\/state\.mjs['"]/);
  assert.match(app, /pointerdown/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /ArrowUp/);
  assert.match(app, /orientationchange/);
  assert.match(app, /createAudioController/);
  assert.match(app, /shareReceipt/);
  assert.match(app, /id === 'home-sheet'[\s\S]{0,120}portraitRenderer\.resize\(\)/);
  assert.match(app, /if \(!\(frame\+\+ % 8\)\) updateContextLabel\(\)/);
  assert.doesNotMatch(app, /if \(!\(frame\+\+ % 8\)\) renderUi\(\)/);
  assert.match(app, /shouldOfferReceipt\(events\)\) offerReceipt\(\)/);
  assert.doesNotMatch(app, /shouldOfferReceipt\(events\)\) openSheet/);
  assert.match(app, /state\.mode === 'fight'[\s\S]{0,180}openSheet\('encounter-sheet'\)/);
});

test('Siren Shore contains no remote runtime dependencies', () => {
  for (const path of [
    'games/siren-shore/index.html',
    'games/siren-shore/assets/styles.css',
    'games/siren-shore/assets/app.mjs',
    'games/siren-shore/assets/render.mjs',
  ]) {
    assert.doesNotMatch(read(path), /https?:\/\//);
  }
});

test('Pages workflow validates every Siren Shore module and README publishes the route', () => {
  const workflow = read('.github/workflows/pages.yml');
  for (const module of ['data', 'state', 'game', 'render', 'audio', 'share', 'app']) {
    assert.match(workflow, new RegExp(`node --check games\\/siren-shore\\/assets\\/${module}\\.mjs`));
  }
  assert.match(workflow, /generate_siren_score\.py --check/);
  assert.match(read('README.md'), /games\/siren-shore/);
});
