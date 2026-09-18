import {
  createGameState,
  getScene,
  getAvailableChoices,
  choose,
  evaluateRun,
  evidenceForResult,
  getProgress,
} from './game.mjs';
import {
  createOminousScore,
  normalizeSoundPreference,
} from './audio.mjs';

const root = document.querySelector('#game');
const announcement = document.querySelector('#announcement');
const soundToggle = document.querySelector('#sound-toggle');
const soundLabel = soundToggle.querySelector('[data-sound-label]');
const storageKey = 'youre-next-survival-runs';
const soundStorageKey = 'youre-next-survival-sound';

function storedRuns() {
  try { return Number(window.localStorage.getItem(storageKey)) || 0; }
  catch { return 0; }
}

function variantForRun(runCount) {
  return runCount % 2 === 0 ? 'fox' : 'lamb';
}

let runCount = storedRuns();
let state = createGameState({ variant: variantForRun(runCount) });
let view = 'cover';
let pendingResult = false;
let locked = false;
let soundEnabled = (() => {
  try { return normalizeSoundPreference(window.localStorage.getItem(soundStorageKey)); }
  catch { return true; }
})();
const score = createOminousScore({ enabled: soundEnabled });

function updateSoundControl() {
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundLabel.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  soundToggle.title = soundEnabled ? 'Turn ominous score off' : 'Turn ominous score on';
}

function announce(message) {
  announcement.textContent = '';
  window.setTimeout(() => { announcement.textContent = message; }, 20);
}

function coverTemplate() {
  return `
    <section class="cover enter" aria-labelledby="cover-title">
      <div class="cover-visual" aria-hidden="true">
        <div class="house-lines"></div>
        <div class="mask mask-fox"><span></span></div>
        <div class="mask mask-lamb"><span></span></div>
        <div class="mask mask-tiger"><span></span></div>
        <p>NO ONE IS COMING TO SAVE THE HOUSE.</p>
      </div>
      <div class="cover-copy">
        <span class="eyebrow">A FIVE-MINUTE SURVIVAL CASE</span>
        <h1 id="cover-title" tabindex="-1">Can You Survive <em>You’re Next?</em></h1>
        <p class="dek">The family is lying. The exits are compromised. The people in masks believe they understand the plan.</p>
        <div class="warning">
          <b>KENDRA RIDDLE HAS ENTERED THE HOUSE.</b>
          <span>This game does not award competence for enthusiasm. You will have to earn it.</span>
        </div>
        <button class="primary" type="button" data-action="start">ENTER THE HOUSE <span aria-hidden="true">→</span></button>
        <p class="sound-note"><span aria-hidden="true">◖))</span> Headphones recommended. The house is listening.</p>
        <p class="fine-print">Seven decisions. Approximately five minutes. Spoilers, naturally.</p>
      </div>
    </section>`;
}

function sceneTemplate() {
  const scene = getScene(state);
  const choices = getAvailableChoices(state);
  const progress = getProgress(state);
  return `
    <section class="scene enter" aria-labelledby="scene-title">
      <div class="progress-block">
        <div class="progress-meta"><span>SCENE ${scene.number} / 07</span><span>${progress}% COMPLETE</span></div>
        <div class="progress-track" role="progressbar" aria-label="Case progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>
      </div>
      <div class="scene-layout">
        <aside class="case-file" aria-hidden="true">
          <span class="case-number">${scene.number}</span>
          <div class="case-mark">${state.variant === 'fox' ? 'FOX' : 'LAMB'}</div>
          <p>ONE CHOICE.<br>NO REVISIONS.</p>
        </aside>
        <article class="scene-card">
          <span class="eyebrow">${scene.eyebrow}</span>
          <h1 id="scene-title" tabindex="-1">${scene.title}</h1>
          <p class="scene-body">${scene.body}</p>
          <p class="variant-note"><span aria-hidden="true">◉</span>${scene.variantNote}</p>
          <div class="choices" role="group" aria-label="Available decisions">
            ${choices.map((item, index) => `
              <button class="choice" type="button" data-choice="${item.id}">
                <span class="choice-index" aria-hidden="true">0${index + 1}</span>
                <span><b>${item.label}</b><small>${item.detail}</small></span>
                <i aria-hidden="true">→</i>
              </button>`).join('')}
          </div>
          ${state.history.length === 0 ? `
            <div class="sound-check">
              <button class="sound-test" type="button" data-action="test-sound">
                <span class="sound-test-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                <span>TEST SOUND</span>
              </button>
              <small>Three clear tones. This does not affect your case.</small>
            </div>` : ''}
        </article>
      </div>
      <p class="lock-note">Your decision becomes part of the case. There is no back button.</p>
    </section>`;
}

function consequenceTemplate() {
  const sceneNumber = String(state.history.length).padStart(2, '0');
  return `
    <section class="consequence enter" aria-labelledby="consequence-title">
      <span class="eyebrow">CONSEQUENCE ${sceneNumber}</span>
      <div class="slash" aria-hidden="true"></div>
      <h1 id="consequence-title" tabindex="-1">${state.lastConsequence}</h1>
      <p>${pendingResult ? 'The house has finished counting.' : 'The situation has changed. Your next choice will not begin from the same house.'}</p>
      <button class="primary" type="button" data-action="continue">${pendingResult ? 'READ THE VERDICT' : 'KEEP MOVING'} <span aria-hidden="true">→</span></button>
    </section>`;
}

function resultTemplate() {
  const result = evaluateRun(state);
  const evidence = evidenceForResult(state);
  return `
    <section class="result result-${result.slug} enter" aria-labelledby="result-title">
      <div class="result-hero">
        <span class="rank">${result.secret ? '◆ ' : ''}${result.rank}</span>
        <p>YOUR VERDICT</p>
        <h1 id="result-title" tabindex="-1">${result.title}</h1>
        <strong>${result.verdict}</strong>
      </div>
      <div class="result-content">
        <p class="diagnosis">${result.diagnosis}</p>
        <section class="evidence" aria-labelledby="evidence-title">
          <h2 id="evidence-title">THE GAME’S EVIDENCE</h2>
          <ol>${evidence.map((item) => `<li>${item}</li>`).join('')}</ol>
        </section>
        <blockquote>“${result.quote}”</blockquote>
        <div class="result-stats" aria-label="Run summary">
          <div><span>DECISIONS</span><b>${state.history.length}/7</b></div>
          <div><span>CASUALTIES</span><b>${state.casualties}</b></div>
          <div><span>HOUSE</span><b>${state.flags.lastStanding ? 'QUIET' : 'UNRESOLVED'}</b></div>
        </div>
        <div class="actions">
          <button class="primary" type="button" data-action="share">SHARE THE VERDICT</button>
          <button class="secondary" type="button" data-action="restart">ENTER AGAIN</button>
        </div>
        <p class="fine-print">${runCount > 0 ? 'The house changed one assumption. It may do so again.' : 'A second run changes one assumption.'} This result has not been reviewed by a therapist, survivalist, or criminal attorney.</p>
      </div>
    </section>`;
}

function render({ focus = true } = {}) {
  root.innerHTML = view === 'cover' ? coverTemplate() : view === 'scene' ? sceneTemplate() : view === 'consequence' ? consequenceTemplate() : resultTemplate();
  document.body.dataset.view = view;
  if (focus) root.querySelector('h1')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

async function shareResult(button) {
  const result = evaluateRun(state);
  const text = `I entered the house and earned “${result.title}” in Can You Survive You’re Next?`;
  try {
    if (navigator.share) {
      await navigator.share({ title: result.title, text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    button.textContent = 'VERDICT COPIED';
  } catch (error) {
    if (error?.name !== 'AbortError') button.textContent = 'SCREENSHOT THE EVIDENCE';
  }
}

async function runSoundTest(button) {
  const label = button.querySelector('span:last-child');
  button.disabled = true;
  label.textContent = 'PLAYING…';
  let outcome;
  try { outcome = await score.testSound(); }
  catch { outcome = { played: false, state: 'error' }; }
  const message = outcome.played ? 'SOUND PLAYED' : 'SOUND BLOCKED';
  label.textContent = message;
  button.dataset.status = outcome.played ? 'played' : 'blocked';
  button.disabled = false;
  announce(outcome.played ? 'Sound test played three tones.' : `Sound test blocked. Audio state: ${outcome.state}.`);
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || locked) return;

  if (button.dataset.choice) {
    locked = true;
    button.classList.add('selected');
    score.impact();
    const nextState = choose(state, button.dataset.choice);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 340;
    window.setTimeout(() => {
      state = nextState;
      score.setScene(state.history.length);
      pendingResult = state.view === 'result';
      view = 'consequence';
      locked = false;
      render();
      announce(state.lastConsequence);
    }, delay);
    return;
  }

  switch (button.dataset.action) {
    case 'test-sound':
      runSoundTest(button);
      break;
    case 'start':
      score.start();
      score.setScene(0);
      view = 'scene';
      render();
      announce('Scene 1 of 7.');
      break;
    case 'continue':
      view = pendingResult ? 'result' : 'scene';
      if (pendingResult) score.end(evaluateRun(state).slug);
      render();
      announce(pendingResult ? `Your verdict is ${evaluateRun(state).title}.` : `Scene ${state.history.length + 1} of 7.`);
      break;
    case 'restart':
      runCount += 1;
      try { window.localStorage.setItem(storageKey, String(runCount)); } catch { /* private mode */ }
      state = createGameState({ variant: variantForRun(runCount) });
      score.reset();
      pendingResult = false;
      view = 'scene';
      render();
      announce('The house has changed. Scene 1 of 7.');
      break;
    case 'share':
      shareResult(button);
      break;
  }
});

soundToggle.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  try { window.localStorage.setItem(soundStorageKey, soundEnabled ? 'on' : 'off'); } catch { /* private mode */ }
  await score.setEnabled(soundEnabled);
  if (soundEnabled && view !== 'cover' && !score.isStarted()) {
    await score.start();
    score.setScene(state.history.length);
  }
  updateSoundControl();
  announce(soundEnabled ? 'Ominous score on.' : 'Ominous score off.');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) score.pause();
  else score.resume();
});

updateSoundControl();
render({ focus: false });
