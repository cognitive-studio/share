# Siren Shore Mobile Public Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an endless, phone-first Siren Shore browser game with persistent collecting, optional mermaid drama, original music and effects, and shareable Siren Receipt images.

**Architecture:** A self-contained static game under `games/siren-shore/` uses focused ES modules for generated content, versioned state, gameplay rules, Canvas rendering, audio, sharing, and application coordination. GitHub Pages serves relative assets; local storage holds all progression; no network runtime is required.

**Tech Stack:** Semantic HTML, modern CSS, JavaScript ES modules, Canvas 2D, Web Audio API, Web Share API, localStorage, Node 24 built-in test runner, Python standard library plus ffmpeg for reproducible soundtrack generation.

**Spec:** `docs/superpowers/specs/2026-09-18-siren-shore-mobile-design.md`

## Global Constraints

- Public route is `/share/games/siren-shore/`.
- No framework, compilation step, backend, account, analytics, remote asset, or runtime service.
- Portrait phone play is primary; desktop keyboard and landscape remain supported.
- All primary touch targets are at least 44 CSS pixels and honor `env(safe-area-inset-*)`.
- Audio starts only after an explicit player gesture and never blocks play.
- Siren Level, generated collection, shore generation, and play duration have no designed cap.
- The player can enjoy collecting without engaging in conflict.
- Appearance has no score or optimized presentation.
- Saves are local, versioned, recoverable on corruption, and private.
- The art direction is “a lost Sega Saturn mermaid game remastered by drag queens.”
- Tests run with `node --test test/*.test.mjs`.

---

## File Map

### New public game

- `games/siren-shore/index.html` — semantic app shell, metadata, controls, dialogs, and module entrypoint.
- `games/siren-shore/favicon.svg` — local shell-and-tiara icon.
- `games/siren-shore/assets/styles.css` — responsive art direction, phone controls, sheets, safe areas, and reduced motion.
- `games/siren-shore/assets/data.mjs` — vocabularies, NPC definitions, dialogue, palettes, and combinatorial generators.
- `games/siren-shore/assets/state.mjs` — save schema, default state, migration, persistence, recovery, IDs, and level math.
- `games/siren-shore/assets/game.mjs` — pure game transitions for inventory, provenance, shores, relationships, and altercations.
- `games/siren-shore/assets/render.mjs` — Canvas ocean, mermaids, objects, camera, resizing, and portrait rendering.
- `games/siren-shore/assets/audio.mjs` — soundtrack lifecycle, Web Audio effects, persisted music/effects settings.
- `games/siren-shore/assets/share.mjs` — Siren Receipt Canvas generation, native file sharing, download/copy fallback.
- `games/siren-shore/assets/app.mjs` — application state, DOM rendering, touch/keyboard input, sheets, and lifecycle.
- `games/siren-shore/assets/siren-score.mp3` — original locally hosted looping score.

### New source and tests

- `scripts/generate_siren_score.py` — deterministic soundtrack source.
- `test/siren-data.test.mjs` — generator and content validity.
- `test/siren-state.test.mjs` — persistence, recovery, migration, and uncapped level math.
- `test/siren-game.test.mjs` — provenance, collection, NPC memory, and combat transitions.
- `test/siren-audio.test.mjs` — gesture gate and independent preferences.
- `test/siren-share.test.mjs` — receipt payload and fallback behavior.
- `test/siren-site.test.mjs` — route, asset, mobile, shelf, workflow, and remote dependency checks.

### Existing files modified

- `index.html` — add Siren Shore card and broaden shelf language.
- `assets/styles.css` — style the game card without changing existing quiz cards.
- `README.md` — document the public game route and games directory.
- `.github/workflows/pages.yml` — syntax-check game modules and reproduce/validate soundtrack.

---

### Task 1: Generated Content and Versioned State

**Files:**
- Create: `games/siren-shore/assets/data.mjs`
- Create: `games/siren-shore/assets/state.mjs`
- Create: `test/siren-data.test.mjs`
- Create: `test/siren-state.test.mjs`

**Interfaces:**
- Produces: `generateItem(random, context)`, `generateShore(random, level)`, `NPC_DEFINITIONS`, `createDefaultState()`, `loadState(storage)`, `saveState(storage, state)`, `nextId(state, prefix)`, `levelForXp(xp)`, and `xpForLevel(level)`.
- Item records use `{ id, name, description, category, slot, rarity, colors, ownerId, origin, history, parents }`.
- Save records use `{ version, player, inventory, purseIds, equipped, npcs, shore, progression, settings, counters, lastIncident }`.

- [ ] **Step 1: Write generator tests**

Create tests that inject a cycling deterministic random function, generate 2,000 items, and assert every record has a nonempty name, description, slot, rarity, colors, origin, and history array. Assert at least 500 distinct names and verify examples can combine emotional, material, and object vocabularies.

```js
test('item generation remains combinatorial and valid', () => {
  const random = cyclingRandom();
  const items = Array.from({ length: 2000 }, () =>
    generateItem(random, { ownerId: 'player', shoreName: 'The Tax-Deductible Trench' }),
  );
  assert.equal(items.every(isValidItem), true);
  assert.ok(new Set(items.map(({ name }) => name)).size >= 500);
});
```

- [ ] **Step 2: Run the content tests and verify failure**

Run: `node --test test/siren-data.test.mjs`  
Expected: FAIL because `data.mjs` does not exist.

- [ ] **Step 3: Implement deterministic combinatorial data**

Export frozen vocabulary arrays and pure generators. Build item names from condition, material, attitude, and object terms, with description templates selected independently. Define at least eight persistent NPCs with palette, temperament, signature read, possession preference, and starting relationship values.

- [ ] **Step 4: Write state tests**

Cover default schema, stable ID increments, uncapped level math through level 100,000, valid-save round trip, migration from version 1, unavailable storage fallback, and corrupt JSON recovery under `siren-shore:recovery:<timestamp>`.

```js
test('level math remains finite without a cap', () => {
  const xp = xpForLevel(100000);
  assert.ok(Number.isSafeInteger(xp));
  assert.equal(levelForXp(xp), 100000);
});
```

- [ ] **Step 5: Run the state tests and verify failure**

Run: `node --test test/siren-state.test.mjs`  
Expected: FAIL because `state.mjs` does not exist.

- [ ] **Step 6: Implement save state and recovery**

Use schema version 2, key `siren-shore:save:v2`, and an injectable storage interface. Return `{ state, warning, recovered }` from `loadState`. Use integer-safe quadratic level thresholds and preserve all unknown provenance text during migration.

- [ ] **Step 7: Run both test files**

Run: `node --test test/siren-data.test.mjs test/siren-state.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add games/siren-shore/assets/data.mjs games/siren-shore/assets/state.mjs test/siren-data.test.mjs test/siren-state.test.mjs
git commit -m "feat: add endless Siren Shore content and state"
```

---

### Task 2: Collection, Provenance, NPC Memory, and Drama

**Files:**
- Create: `games/siren-shore/assets/game.mjs`
- Create: `test/siren-game.test.mjs`

**Interfaces:**
- Consumes: item generators and state helpers from Task 1.
- Produces: `createOuting(state, random)`, `collectFind(state, findId)`, `packItem(state, itemId)`, `equipItem(state, itemId)`, `remixItems(state, itemIds, random)`, `resolveEncounter(state, npcId, action, random)`, `resolveFightMove(state, npcId, move, random)`, `returnHome(state)`, and `advanceShore(state, random)`.
- Every transition returns `{ state, events }` without mutating its input.

- [ ] **Step 1: Write pure transition tests**

Test finds, safe home storage, purse capacity, equipping, remix ancestry, trade, snatch, loss, recovery, XP, shore advancement, and explicit no-conflict leaving. Assert histories append exact human-readable provenance entries and prior entries remain intact.

```js
test('an NPC remembers a stolen tiara when it is worn later', () => {
  const stolen = resolveEncounter(seedState(), 'cynthia', 'snatch', alwaysWin);
  const equipped = equipItem(stolen.state, stolen.events[0].itemId);
  const reunion = resolveEncounter(equipped.state, 'cynthia', 'greet', midpoint);
  assert.match(reunion.events.map(event => event.text).join(' '), /tiara/i);
  assert.ok(reunion.state.npcs.cynthia.rivalry > 0);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test test/siren-game.test.mjs`  
Expected: FAIL because `game.mjs` does not exist.

- [ ] **Step 3: Implement immutable collection transitions**

Implement purse capacity by purse type; home inventory remains uncapped. A find receives a provenance entry and player owner ID. Remix consumes two or three items and creates one child whose `parents` list preserves all source IDs and names.

- [ ] **Step 4: Implement social actions and NPC memory**

Each action updates relationship dimensions and writes specific memory records. `leave` never penalizes the player. `compliment` and `trade` are mechanically complete alternatives to hostility.

- [ ] **Step 5: Implement SNATCH / READ / FLOURISH combat**

Use a three-move relationship rather than health. Complete an altercation within at most three rounds. Winning or losing may transfer one at-risk item, append provenance, update wins/losses, and create a `lastIncident` suitable for a receipt.

- [ ] **Step 6: Run all engine tests**

Run: `node --test test/siren-data.test.mjs test/siren-state.test.mjs test/siren-game.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add games/siren-shore/assets/game.mjs test/siren-game.test.mjs
git commit -m "feat: add persistent Siren Shore collection drama"
```

---

### Task 3: Phone-First Shell and Art Direction

**Files:**
- Create: `games/siren-shore/index.html`
- Create: `games/siren-shore/favicon.svg`
- Create: `games/siren-shore/assets/styles.css`
- Create: `test/siren-site.test.mjs`

**Interfaces:**
- Produces stable element IDs and data attributes used by `app.mjs`: `ocean-canvas`, `move-pad`, `action-button`, `hud`, `toast`, `home-sheet`, `encounter-sheet`, `inventory-sheet`, `settings-sheet`, `share-sheet`, `music-toggle`, and `effects-toggle`.

- [ ] **Step 1: Write structural and phone CSS tests**

Assert the route exists, viewport includes `viewport-fit=cover`, controls are buttons, the joystick and action button exist, CSS includes all safe-area variables, primary controls use `min-width` and `min-height` of at least 44px, reduced motion is present, and local references resolve.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test test/siren-site.test.mjs`  
Expected: FAIL because the game entrypoint does not exist.

- [ ] **Step 3: Create semantic app shell**

Include social metadata, an audio opt-in splash, compact HUD, full-bleed Canvas, joystick, action button, tab bar, accessible sheets, status announcements, reset confirmation, and a noscript message. The first screen exposes Customize, Pack Purse, and Enter the Ocean.

- [ ] **Step 4: Implement the visual system**

Use deep cobalt, teal, bruised purple, radioactive coral, pearl, and hot pink. Build hard-edged editorial panels, oversized condensed headings using local system fonts, dither effects with CSS gradients, and arcade action treatments. Avoid generic glass cards.

- [ ] **Step 5: Implement responsive and accessible states**

Use dynamic viewport units with fallbacks, safe-area padding, portrait-first layout, landscape rearrangement, desktop keyboard hints, visible focus, `prefers-reduced-motion`, and `prefers-contrast`.

- [ ] **Step 6: Run site tests**

Run: `node --test test/siren-site.test.mjs`  
Expected: all current tests PASS.

- [ ] **Step 7: Commit**

```bash
git add games/siren-shore/index.html games/siren-shore/favicon.svg games/siren-shore/assets/styles.css test/siren-site.test.mjs
git commit -m "feat: add phone-first Siren Shore shell"
```

---

### Task 4: Ocean Renderer, Mermaid Layers, and Input

**Files:**
- Create: `games/siren-shore/assets/render.mjs`
- Create: `games/siren-shore/assets/app.mjs`
- Modify: `test/siren-site.test.mjs`

**Interfaces:**
- `createRenderer(canvas, options)` returns `{ resize, renderFrame, renderPortrait, worldToScreen, destroy }`.
- `createInputController({ pad, actionButton, target, onMove, onAction })` returns `{ destroy }`.
- `bootSirenShore(document, window)` coordinates state, engine, renderer, audio, and share modules.

- [ ] **Step 1: Extend tests for module wiring and input hooks**

Assert the entrypoint loads `app.mjs`, `app.mjs` imports renderer/game/state, pointer events bind to the pad, keyboard arrows/WASD remain supported, and resize/orientation listeners are present.

- [ ] **Step 2: Run the site test and verify failure**

Run: `node --test test/siren-site.test.mjs`  
Expected: FAIL on missing renderer and application modules.

- [ ] **Step 3: Implement Canvas rendering**

Render parallax water gradients, dithered rays, kelp, ruins, particles, finds, NPCs, and the player. Build mermaids from smooth cel-shaded modular layers with bold silhouettes. Keep pickup forms chunky and bright. Scale using device pixel ratio while capping backing resolution for phone performance.

- [ ] **Step 4: Implement touch and keyboard input**

Use pointer capture for joystick drag, normalize movement vectors, release on pointer cancel/up, and prevent scrolling only within the play control. Map the large action button and E/Z/Enter to the same contextual action.

- [ ] **Step 5: Implement application coordination**

Render home, ocean, encounter, fight, inventory, wardrobe, and settings states. Save after every meaningful transition. Pause movement behind sheets. Announce finds and outcomes through both visible toast and polite live region.

- [ ] **Step 6: Run engine and site tests**

Run: `node --test test/siren-data.test.mjs test/siren-state.test.mjs test/siren-game.test.mjs test/siren-site.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add games/siren-shore/assets/render.mjs games/siren-shore/assets/app.mjs games/siren-shore/index.html test/siren-site.test.mjs
git commit -m "feat: render and control Siren Shore on phones"
```

---

### Task 5: Original Soundtrack and Interaction Effects

**Files:**
- Create: `scripts/generate_siren_score.py`
- Create: `games/siren-shore/assets/siren-score.mp3`
- Create: `games/siren-shore/assets/audio.mjs`
- Create: `test/siren-audio.test.mjs`
- Modify: `games/siren-shore/assets/app.mjs`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- `createAudioController({ audioContextFactory, soundtrackUrl, settings, onSettings })` returns `{ unlock, setMusicEnabled, setEffectsEnabled, playEffect, setScene, suspend, resume, destroy }`.
- Effects names are `enter`, `find`, `rareFind`, `equip`, `pack`, `compliment`, `trade`, `shade`, `read`, `snatch`, `loss`, `victory`, `levelUp`, `home`, and `share`.

- [ ] **Step 1: Write audio contract tests**

Use fake AudioContext and soundtrack objects. Assert construction does not start sound, `unlock()` resumes context and starts music when enabled, music/effects toggle independently, disabled effects remain silent, scene changes alter gain targets, and initialization rejection resolves to a nonblocking status.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/siren-audio.test.mjs`  
Expected: FAIL because `audio.mjs` does not exist.

- [ ] **Step 3: Write deterministic soundtrack generator**

Generate a 96–120 second stereo WAV using Python standard library: aquatic pad harmony, plucked arpeggio, elastic bass, restrained four-on-the-floor pulse, bubble percussion, and two theatrical modulations. Normalize with headroom, then invoke ffmpeg to produce a looping MP3. Use a fixed random seed.

- [ ] **Step 4: Generate and inspect the score**

Run: `python3 scripts/generate_siren_score.py`  
Expected: creates `games/siren-shore/assets/siren-score.mp3` longer than 90 seconds and larger than 500 KB.

- [ ] **Step 5: Implement audio controller and synthesized effects**

Use an HTMLAudioElement for the musical loop routed through a music gain node when available. Generate short effects with oscillator, filter, noise buffer, and envelopes so effects require no additional files. Restore user preferences from game state.

- [ ] **Step 6: Wire explicit gesture activation**

The splash “BEGIN BEING A MERMAID” button calls `unlock()`. If blocked, play continues and the settings control offers retry. Apply scene mix changes for grotto, ocean, encounter, and fight.

- [ ] **Step 7: Extend Pages validation**

Add Node syntax checks for every Siren module. Run the generator in check mode and compare duration/minimum file size without rewriting the committed asset.

- [ ] **Step 8: Run audio and full tests**

Run: `node --test test/*.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate_siren_score.py games/siren-shore/assets/siren-score.mp3 games/siren-shore/assets/audio.mjs games/siren-shore/assets/app.mjs .github/workflows/pages.yml test/siren-audio.test.mjs
git commit -m "feat: score Siren Shore with camp aquatic audio"
```

---

### Task 6: Siren Receipt Image Sharing

**Files:**
- Create: `games/siren-shore/assets/share.mjs`
- Create: `test/siren-share.test.mjs`
- Modify: `games/siren-shore/assets/app.mjs`
- Modify: `games/siren-shore/index.html`

**Interfaces:**
- `createReceiptModel(state)` returns serializable receipt content.
- `renderReceipt(canvas, model, renderPortrait)` returns the Canvas.
- `shareReceipt({ canvas, navigatorObject, documentObject, locationHref })` returns `{ method: 'native' | 'download' | 'copy', canceled: boolean }`.

- [ ] **Step 1: Write receipt model and fallback tests**

Assert featured incidents include title, level, object, provenance, NPC, editorial headline, disgraceful caption, and clean game URL. Mock `navigator.canShare`, `navigator.share`, clipboard, and anchor download. Verify AbortError is reported as canceled rather than failed.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/siren-share.test.mjs`  
Expected: FAIL because the game share module does not exist.

- [ ] **Step 3: Implement deterministic receipt copy**

Build headlines and captions from state and last incident without a network call. Include lines such as “PROPERTY CHANGED HANDS,” “THE OCEAN DECLINED TO COMMENT,” and context-specific NPC grievances.

- [ ] **Step 4: Implement high-resolution Canvas card**

Render a 1080×1350 portrait image using the same palette and modular portrait renderer. Include safe margins, readable text wrapping, object provenance, player title, and URL. Do not include the complete inventory or hidden state.

- [ ] **Step 5: Implement native sharing and fallback**

Convert Canvas to PNG Blob/File. Prefer native file share, then PNG download plus clipboard URL, then URL-only clipboard. Revoke temporary object URLs after use.

- [ ] **Step 6: Wire manual and incident-triggered receipt offers**

Expose “MAKE A RECEIPT” in the tab bar and show a nonblocking receipt prompt after rare finds, possession changes, and especially severe reads.

- [ ] **Step 7: Run share and full tests**

Run: `node --test test/*.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add games/siren-shore/assets/share.mjs games/siren-shore/assets/app.mjs games/siren-shore/index.html test/siren-share.test.mjs
git commit -m "feat: generate shareable Siren Receipts"
```

---

### Task 7: Share Shelf, Documentation, and Publication Wiring

**Files:**
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `README.md`
- Modify: `.github/workflows/pages.yml`
- Modify: `test/site.test.mjs`
- Modify: `test/siren-site.test.mjs`

**Interfaces:**
- Root shelf links to `./games/siren-shore/`.
- Pages workflow validates all game modules and includes all static assets.

- [ ] **Step 1: Extend shelf and repository tests**

Assert root copy includes “games, quizzes, and highly specific nonsense,” the Siren Shore card and route exist, the experience count is 03, README lists the public URL, and workflow checks every game module.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/site.test.mjs test/siren-site.test.mjs`  
Expected: FAIL on missing shelf integration.

- [ ] **Step 3: Add the Siren Shore shelf card**

Create a card with an underwater editorial art treatment, category “ENDLESS · MERMAIDS · OPTIONAL DRAMA,” concise loop description, and “ENTER THE OCEAN” launch copy. Preserve both existing quiz cards.

- [ ] **Step 4: Broaden collection language and documentation**

Update page title, description, intro, footer, README structure, add-game guidance, published routes, and workflow name from quiz-only language to the broader Share collection.

- [ ] **Step 5: Update legacy site tests**

Add the game to `publishedPages`, preserve local reference and remote dependency checks, and limit the old `data-share-quiz` assertion to quiz routes.

- [ ] **Step 6: Run every automated check**

Run:
```bash
node --test test/*.test.mjs
node --check games/siren-shore/assets/data.mjs
node --check games/siren-shore/assets/state.mjs
node --check games/siren-shore/assets/game.mjs
node --check games/siren-shore/assets/render.mjs
node --check games/siren-shore/assets/audio.mjs
node --check games/siren-shore/assets/share.mjs
node --check games/siren-shore/assets/app.mjs
```
Expected: all tests and syntax checks PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html assets/styles.css README.md .github/workflows/pages.yml test/site.test.mjs test/siren-site.test.mjs
git commit -m "feat: publish Siren Shore on the Share shelf"
```

---

### Task 8: Browser Verification, Pull Request, Merge, and Live Pages Check

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Live route: `https://cognitive-studio.github.io/share/games/siren-shore/`.

- [ ] **Step 1: Serve the branch locally**

Run: `python3 -m http.server 4173` from the repository root.  
Expected: the shelf and game load with no console errors.

- [ ] **Step 2: Verify phone portrait flow**

At 390×844 CSS pixels, start audio from the splash, customize the mermaid, pack a purse, enter the ocean, move by joystick, collect a find, meet an NPC, complete an action, return home, and reload. Expected: no horizontal scrolling, no hidden primary control, and state persists.

- [ ] **Step 3: Verify desktop flow**

Use keyboard controls and resize between portrait, landscape, and desktop. Expected: input remains responsive and Canvas preserves state.

- [ ] **Step 4: Verify audio**

Confirm the soundtrack has melody and rhythm, loops without a long silence, and differs audibly between grotto, ocean, encounter, and fight. Toggle music and effects independently, background and resume the page, and verify play remains functional if audio is denied.

- [ ] **Step 5: Verify sharing**

Generate a receipt after a find and an NPC incident. Verify a 1080×1350 PNG, readable portrait/copy, native share where supported, canceled sharing without an error banner, and download/copy fallback.

- [ ] **Step 6: Run final clean verification**

Run all commands from Task 7 Step 6 after any browser fixes. Expected: every check PASS.

- [ ] **Step 7: Open the pull request**

Open a PR from `feat/siren-shore-mobile` to `main` summarizing gameplay, phone support, audio, receipts, shelf integration, and test evidence.

- [ ] **Step 8: Review and merge**

Review the final diff for remote URLs, accidental personal data, generated binary size, and unrelated changes. Merge only after checks pass.

- [ ] **Step 9: Verify GitHub Pages**

Wait for the Pages workflow, confirm a successful deployment, open the live route, and repeat start, movement, sound, one find, and one receipt smoke test.

- [ ] **Step 10: Report the result**

Return the live game URL, PR URL, merge commit, test count, and any honest browser limitations.
