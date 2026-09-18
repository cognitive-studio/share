# You’re Next Survival Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested, five-minute branching *You’re Next* survival game to the Cognitive Studio share collection.

**Architecture:** A pure JavaScript narrative engine owns scenes, state mutation, choice prerequisites, replay variation, and result evaluation. A separate DOM renderer turns that state into an accessible single-page experience. The existing static GitHub Pages architecture remains unchanged.

**Tech Stack:** HTML5, CSS, ECMAScript modules, Node 24 built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-18-youre-next-survival-design.md`

## Global Constraints

- No runtime dependencies, build system, remote assets, analytics, or services.
- Seven decisions per complete run; target completion time is five minutes.
- No visible morality or attribute meter.
- Earlier choices must govern later availability.
- All behavior must be keyboard accessible and reduced-motion safe.
- The existing couples quiz must continue to pass unchanged.

---

### Task 1: Narrative engine

**Files:**
- Create: `test/survival-game.test.mjs`
- Create: `quizzes/youre-next-survival/assets/game.mjs`

**Interfaces:**
- Produces: `scenes`, `outcomes`, `createGameState({ variant })`, `getScene(state)`, `getAvailableChoices(state)`, `choose(state, choiceId)`, `evaluateRun(state)`, and `getProgress(state)`.

- [ ] Write engine tests for initial state, prerequisite-gated choices, seven-step completion, top-rank gating, distinct moral routes, replay variants, invalid choices, and the secret ending.
- [ ] Run `node --test test/survival-game.test.mjs` and confirm failure because the engine does not exist.
- [ ] Implement the smallest deterministic state engine and narrative data that satisfy the tests.
- [ ] Run `node --test test/survival-game.test.mjs` and confirm all engine tests pass.

### Task 2: Playable interface

**Files:**
- Create: `quizzes/youre-next-survival/index.html`
- Create: `quizzes/youre-next-survival/assets/app.mjs`
- Create: `quizzes/youre-next-survival/assets/styles.css`
- Create: `quizzes/youre-next-survival/favicon.svg`
- Modify: `test/site.test.mjs`

**Interfaces:**
- Consumes: the pure engine exports from Task 1.
- Produces: cover, scene, consequence, and outcome views; replay persistence through `localStorage`; native share or clipboard fallback.

- [ ] Extend site tests to require the new entrypoint, shelf route, resolvable local assets, and no remote dependencies.
- [ ] Run `node --test test/site.test.mjs` and confirm failure because the new route and assets do not exist.
- [ ] Implement semantic HTML and the DOM renderer with live announcements, focus management, and consequence transitions.
- [ ] Implement responsive cinematic styling and reduced-motion behavior.
- [ ] Run site and engine tests and confirm they pass.

### Task 3: Collection and deployment

**Files:**
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `README.md`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: the complete game route from Task 2.
- Produces: collection discovery and deployment validation.

- [ ] Add a survival-game card and update the collection count.
- [ ] Update documentation and workflow syntax checks for both game modules.
- [ ] Run `node --test test/*.test.mjs` and `node --check` for every JavaScript module.
- [ ] Preview the site locally at desktop and mobile widths; verify cover, choice, consequence, result, share fallback, replay variant, keyboard focus, and reduced motion.
- [ ] Commit the completed feature and open a pull request against `main`.

