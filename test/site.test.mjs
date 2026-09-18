import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function localReferences(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((reference) => reference.startsWith('./') || reference.startsWith('../'));
}

const publishedPages = [
  'index.html',
  'quizzes/youre-next-couple/index.html',
  'quizzes/youre-next-survival/index.html',
];

test('collection shelf launches both published routes', () => {
  const shelf = read('index.html');
  assert.match(shelf, /href=["']\.\/quizzes\/youre-next-couple\/["']/);
  assert.match(shelf, /href=["']\.\/quizzes\/youre-next-survival\/["']/);
});

test('quiz entrypoints and Pages workflow exist', () => {
  assert.equal(existsSync(resolve(root, 'quizzes/youre-next-couple/index.html')), true);
  assert.equal(existsSync(resolve(root, 'quizzes/youre-next-survival/index.html')), true);
  assert.equal(existsSync(resolve(root, '.github/workflows/pages.yml')), true);
});

test('survival game exposes a self-contained sound control and score module', () => {
  const entrypoint = read('quizzes/youre-next-survival/index.html');
  const app = read('quizzes/youre-next-survival/assets/app.mjs');
  const workflow = read('.github/workflows/pages.yml');
  assert.match(entrypoint, /id=["']sound-toggle["']/);
  assert.match(app, /from ['"]\.\/audio\.mjs['"]/);
  assert.equal(existsSync(resolve(root, 'quizzes/youre-next-survival/assets/audio.mjs')), true);
  assert.match(workflow, /node --check quizzes\/youre-next-survival\/assets\/audio\.mjs/);
});

test('scene one exposes a diagnostic sound control without affecting a choice', () => {
  const app = read('quizzes/youre-next-survival/assets/app.mjs');
  assert.match(app, /data-action=["']test-sound["']/);
  assert.match(app, /score\.testSound\(\)/);
  assert.match(app, /SOUND PLAYED/);
  assert.match(app, /SOUND BLOCKED/);
});

test('survival game loads the original cinematic score through the audio controller', () => {
  const app = read('quizzes/youre-next-survival/assets/app.mjs');
  const audio = read('quizzes/youre-next-survival/assets/audio.mjs');
  assert.match(app, /house-score\.mp3/);
  assert.match(app, /soundtrackUrl/);
  assert.match(audio, /soundtrack\.play\(\)/);
});

test('every local stylesheet, module, and favicon reference resolves', () => {
  for (const path of publishedPages) {
    const html = read(path);
    for (const reference of localReferences(html)) {
      const clean = reference.split(/[?#]/)[0];
      assert.equal(existsSync(resolve(root, dirname(path), clean)), true, `${path} -> ${reference}`);
    }
  }
});

test('published pages do not depend on remote assets', () => {
  for (const path of [
    ...publishedPages,
    'assets/styles.css',
    'quizzes/youre-next-couple/assets/styles.css',
    'quizzes/youre-next-survival/assets/styles.css',
  ]) {
    assert.doesNotMatch(read(path), /https?:\/\//);
  }
});
