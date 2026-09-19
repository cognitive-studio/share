import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as sirenApp from '../games/siren-shore/assets/app.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Siren Shore entrypoint is a phone-first semantic game shell', () => {
  const html = read('games/siren-shore/index.html');
  assert.match(html, /viewport-fit=cover/);
  for (const id of ['ocean-canvas', 'move-pad', 'action-button', 'hud', 'points-value', 'combo-label', 'combo-count', 'rush-banner', 'toast', 'receipt-offer', 'home-sheet', 'encounter-sheet', 'inventory-sheet', 'settings-sheet', 'share-sheet', 'cabinet-sheet', 'cabinet-things', 'cabinet-mermaids', 'cabinet-incidents', 'music-toggle', 'effects-toggle', 'haptics-toggle', 'scale-select', 'fin-select', 'skip-audio']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /<button[^>]+id=["']action-button["']/);
  assert.match(html, /id=["']action-detail["']/);
  assert.match(html, /type=["']module["'][^>]+src=["']\.\/assets\/app\.mjs["']/);
});

test('Cabinet of Allegations is an optional local history sheet without collection pressure', () => {
  const html = read('games/siren-shore/index.html');
  const app = read('games/siren-shore/assets/app.mjs');
  const css = read('games/siren-shore/assets/styles.css');
  assert.match(html, /CABINET/);
  assert.match(html, /data-cabinet-tab=["']things["']/);
  assert.match(app, /createCabinetModel/);
  assert.match(app, /function renderCabinet/);
  assert.match(css, /\.cabinet-tabs/);
  assert.doesNotMatch(html, /completion|percent complete|collection progress/i);
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

test('portrait HUD keeps score and toast in separate safe-area bands', () => {
  const css = read('games/siren-shore/assets/styles.css');
  assert.match(css, /--progress-hud-top:calc\(82px \+ var\(--safe-top\)\)/);
  assert.match(css, /--toast-top:calc\(142px \+ var\(--safe-top\)\)/);
  assert.match(css, /\.current-status\{[^}]*top:var\(--progress-hud-top\)/);
  assert.match(css, /\.toast\{[^}]*top:var\(--toast-top\)/);
});

test('Glamour Arcade declares readable canvas layers and a nonblocking legendary caption', () => {
  const html = read('games/siren-shore/index.html');
  const css = read('games/siren-shore/assets/styles.css');
  assert.match(html, /id=["']ocean-canvas["'][^>]+data-arcade-layers=["']far mid foreground effects["']/);
  assert.match(html, /id=["']arcade-caption["']/);
  assert.match(css, /\.arcade-caption\{[^}]*pointer-events:none/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.arcade-caption/);
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
  assert.match(app, /createHapticsController/);
  assert.match(app, /shareReceipt/);
  assert.match(app, /id === 'home-sheet'[\s\S]{0,120}portraitRenderer\.resize\(\)/);
  assert.match(app, /if \(!\(frame\+\+ % 8\)\) updateContextLabel\(\)/);
  assert.doesNotMatch(app, /if \(!\(frame\+\+ % 8\)\) renderUi\(\)/);
  assert.match(app, /shouldOfferReceipt\(events\)\) offerReceipt\(\)/);
  assert.doesNotMatch(app, /shouldOfferReceipt\(events\)\) openSheet/);
  assert.match(app, /function restoreFightSheet\(\)[\s\S]{0,700}openSheet\('encounter-sheet'\)/);
  assert.match(app, /activeNpcId = state\.mode === 'fight' \? state\.fight\?\.npcId/);
  assert.match(app, /if \(state\.mode === 'fight'\) transition\(returnHome\(state\)\)/);
  assert.match(app, /from ['"]\.\/world\.mjs['"]/);
  assert.match(app, /shouldHandleActionKey/);
  assert.match(app, /stepMotion/);
  assert.match(app, /function updateProgressHud\(\)/);
  assert.match(app, /rare\.tier === 'legendary'/);
});

test('Siren Shore contains no remote runtime dependencies', () => {
  for (const path of [
    'games/siren-shore/index.html',
    'games/siren-shore/assets/styles.css',
    'games/siren-shore/assets/app.mjs',
    'games/siren-shore/assets/current.mjs',
    'games/siren-shore/assets/render.mjs',
  ]) {
    assert.doesNotMatch(read(path), /https?:\/\//);
  }
});

test('Pages workflow dynamically validates every experience module and README publishes the route', () => {
  const workflow = read('.github/workflows/pages.yml');
  assert.match(workflow, /find quizzes games -type f -name ['"]\*\.mjs['"] -print0/);
  assert.match(workflow, /xargs -0 -r -n 1 node --check/);
  assert.match(workflow, /generate_siren_score\.py --check/);
  assert.match(read('README.md'), /games\/siren-shore/);
});

test('mobile release contract documents the one-handed ocean and publishes a separate swell warning', () => {
  const html = read('games/siren-shore/index.html');
  const app = read('games/siren-shore/assets/app.mjs');
  const css = read('games/siren-shore/assets/styles.css');
  const workflow = read('.github/workflows/pages.yml');
  const readme = read('README.md');
  const missing = [];

  for (const id of ['points-value', 'combo-label', 'rush-banner', 'swell-banner', 'cabinet-sheet', 'action-button']) {
    if (!new RegExp(`id=["']${id}["']`).test(html)) missing.push(`shell:${id}`);
  }
  if (!/function updateSwellBanner\(\)/.test(app)) missing.push('app:updateSwellBanner');
  if (!/swell-banner/.test(app)) missing.push('app:swell-banner');
  if (!/\.swell-banner\{[^}]*top:var\(--swell-banner-top\)/.test(css)) missing.push('css:swell safe-area band');
  if (!/--swell-banner-top:calc\(254px \+ var\(--safe-top\)\);--receipt-offer-top:calc\(318px \+ var\(--safe-top\)\)/.test(css)) missing.push('css:portrait swell and receipt clearance');
  if (!/@media \(prefers-reduced-motion:reduce\)[\s\S]*\.swell-banner/.test(css)) missing.push('css:reduced-motion swell banner');
  if (!/find quizzes games -type f -name ['"]\*\.mjs['"] -print0/.test(workflow)) missing.push('workflow:all local modules');
  if (!/xargs -0 -r -n 1 node --check/.test(workflow)) missing.push('workflow:parse every module');
  for (const sentence of [
    'Drag the pearl control to swim',
    'Tap the contextual button to claim, approach, or call',
    'Treasure Rushes and swells end without failure',
    'Progress persists locally on the device',
    'Sound requires the opening touch',
    'haptics depend on device support',
  ]) {
    if (!readme.includes(sentence)) missing.push(`README:${sentence}`);
  }

  assert.deepEqual(missing, []);
});

test('swell banner exposes warning and active water states, then leaves without a failure message', () => {
  assert.equal(typeof sirenApp.swellBannerModel, 'function');
  assert.deepEqual(sirenApp.swellBannerModel('ocean', { phase: 'warning' }), {
    hidden: false, phase: 'warning', text: 'SWELL WARNING · THE OCEAN IS GATHERING AN OPINION',
  });
  assert.deepEqual(sirenApp.swellBannerModel('ocean', { phase: 'active' }), {
    hidden: false, phase: 'active', text: 'SWELL ACTIVE · KEEP SWIMMING',
  });
  assert.deepEqual(sirenApp.swellBannerModel('ocean', null), { hidden: true, phase: null, text: '' });
  assert.deepEqual(sirenApp.swellBannerModel('home', { phase: 'active' }), { hidden: true, phase: null, text: '' });
});
