# Siren Shore Living Ocean Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Turn the existing Siren Shore prototype into a phone-first endless treasure-current game with immediate arcade feedback, nonlethal ocean disruption, persistent reciprocal theft, and autonomous mermaid drama.

**Architecture:** Preserve the dependency-free static browser application and move new rules into deterministic ES modules. \`app.mjs\` coordinates browser input and animation, while \`current.mjs\`, \`hazards.mjs\`, \`social.mjs\`, \`game.mjs\`, and \`state.mjs\` own pure state transitions; \`render.mjs\`, \`audio.mjs\`, and \`haptics.mjs\` consume semantic events. Ship the work in independently playable increments so the live mobile build can be tested after each milestone.

**Tech Stack:** HTML5 Canvas, vanilla CSS, native ES modules, Web Audio API, Vibration API when available, localStorage, Node 24 built-in test runner, GitHub Pages.

**Spec:** \`docs/superpowers/specs/2026-09-18-siren-shore-living-ocean-design.md\`

## Global Constraints

- iPhone portrait play is the release truth; desktop keyboard support remains for development and accessibility.
- No external runtime dependencies, build system, accounts, analytics, cloud saves, or remote assets.
- No missions, health, death, game-over state, required conflict, scarce currency, daily obligation, or lost lifetime points.
- Siren Points are permanent, uncapped, and never spendable.
- Active simulation remains bounded to the current, next, and recently departed zone.
- Existing v2 saves must migrate without losing appearance, inventory, progression, NPC memories, settings, or provenance.
- Mobile audio begins only after an explicit user gesture.
- Reduced-motion mode replaces movement-heavy feedback with static visual emphasis.
- Decorative density degrades before input responsiveness or gameplay readability.
- Each task follows red-green-refactor TDD and ends in a focused commit.

## File map

- Create \`games/siren-shore/assets/world.mjs\`: movement integration, vertical zone streaming, camera intent, and active-window retirement.
- Create \`games/siren-shore/assets/current.mjs\`: falling treasure, target selection, combinations, Treasure Rush pacing, and score awards.
- Create \`games/siren-shore/assets/hazards.mjs\`: nonlethal creature effects, recovery records, swell lifecycle, and swell forces.
- Create \`games/siren-shore/assets/social.mjs\`: NPC targeting, reciprocal theft, relationships, rumors, autonomous incidents, and pursuit.
- Create \`games/siren-shore/assets/haptics.mjs\`: optional mobile vibration patterns with safe no-op behavior.
- Create \`test/siren-world.test.mjs\`, \`test/siren-current.test.mjs\`, \`test/siren-hazards.test.mjs\`, and \`test/siren-social.test.mjs\`.
- Modify \`games/siren-shore/assets/data.mjs\`: semantic object archetypes, zones, hazards, social scene language, and point tables.
- Modify \`games/siren-shore/assets/state.mjs\`: v3 state, normalization, and v2 migration.
- Modify \`games/siren-shore/assets/game.mjs\`: authoritative acquisition, transfer, incident, and progression transitions.
- Modify \`games/siren-shore/assets/render.mjs\`: semantic silhouettes, vertical camera, wildlife cues, target halo, effects pool, and zone presentation.
- Modify \`games/siren-shore/assets/audio.mjs\`: category pickup voices, combination pitch ladder, rush, swell, and social cues.
- Modify \`games/siren-shore/assets/app.mjs\`: orchestration, Space action, mobile loop, semantic-event dispatch, and sheet protection.
- Modify \`games/siren-shore/assets/share.mjs\`: point total, featured possession, and allegation on receipts.
- Modify \`games/siren-shore/index.html\`: mobile HUD, contextual prompt, combo/rush/swell announcements, and Cabinet entry.
- Modify \`games/siren-shore/assets/styles.css\`: safe-area layout, target prompt, point bursts, alerts, and reduced-motion behavior.
- Modify \`.github/workflows/pages.yml\`, \`test/siren-site.test.mjs\`, and \`README.md\`: module validation, public contract, and mobile release checklist.

---

### Task 1: Versioned living-ocean state and content catalog

**Files:**
- Modify: \`games/siren-shore/assets/data.mjs\`
- Modify: \`games/siren-shore/assets/state.mjs\`
- Modify: \`test/siren-data.test.mjs\`
- Modify: \`test/siren-state.test.mjs\`

**Interfaces:**
- Produces: \`ITEM_ARCHETYPES\`, \`ZONE_DEFINITIONS\`, \`HAZARD_DEFINITIONS\`, \`POINT_AWARDS\`, \`pointsForLevel(level)\`, \`levelForPoints(points)\`, \`createDefaultState(random)\`, and v2-to-v3 migration through \`loadState(storage, now)\`.
- State additions: \`world\`, \`current\`, \`social\`, \`effects\`, and \`progression.points\`.

- [ ] **Step 1: Write failing catalog and migration tests**

    const v2Fixture = {
      version: 2,
      player: { hair: 4, name: 'Your Majesty' },
      inventory: [{ id: 'tiara-1', name: 'Haunted Tiara', slot: 'crown', ownerId: 'player', history: ['Found.'] }],
      progression: { xp: 8675309, level: 295, shores: 2, finds: 7, incidents: 3 },
    };

    test('living-ocean catalogs expose readable object and hazard silhouettes', () => {
      assert.ok(ITEM_ARCHETYPES.some(({ id, chain, shape }) => id === 'coin' && chain === 'gold' && shape === 'coin'));
      assert.ok(ITEM_ARCHETYPES.some(({ id, shape }) => id === 'crown' && shape === 'crown'));
      assert.ok(HAZARD_DEFINITIONS.some(({ id, effect }) => id === 'jellyfish' && effect === 'release-item'));
      assert.ok(ZONE_DEFINITIONS.length >= 5);
    });

    test('v2 save migrates into v3 without losing accumulated nonsense', () => {
      const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(v2Fixture) });
      const { state, recovered } = loadState(storage);
      assert.equal(recovered, false);
      assert.equal(state.version, 3);
      assert.equal(state.inventory[0].name, v2Fixture.inventory[0].name);
      assert.equal(state.player.hair, v2Fixture.player.hair);
      assert.equal(state.progression.points, v2Fixture.progression.xp);
      assert.equal(state.world.zoneIndex, 0);
      assert.deepEqual(state.social.relationships, {});
    });

- [ ] **Step 2: Run focused tests and confirm red**

    node --test test/siren-data.test.mjs test/siren-state.test.mjs

Expected: FAIL because the catalogs and v3 fields do not exist and \`SAVE_VERSION\` is still 2.

- [ ] **Step 3: Add frozen catalogs and v3 defaults**

    export const ITEM_ARCHETYPES = Object.freeze([
      { id: 'coin', slot: 'treasure', chain: 'gold', shape: 'coin', weight: 44, points: 4006 },
      { id: 'pearl', slot: 'jewelry', chain: 'pearl', shape: 'pearl', weight: 22, points: 12880 },
      { id: 'jewel', slot: 'jewelry', chain: 'jewelry', shape: 'gem', weight: 18, points: 94500 },
      { id: 'crown', slot: 'crown', chain: 'jewelry', shape: 'crown', weight: 5, points: 388000 },
      { id: 'bag', slot: 'purse', chain: 'couture', shape: 'bag', weight: 7, points: 74000 },
      { id: 'junk', slot: 'treasure', chain: 'junk', shape: 'junk', weight: 24, points: 1888 },
    ]);

    export const HAZARD_DEFINITIONS = Object.freeze([
      { id: 'jellyfish', shape: 'jellyfish', effect: 'release-item', points: 88000 },
      { id: 'eel', shape: 'eel', effect: 'electric-hair', points: 111000 },
      { id: 'squid', shape: 'squid', effect: 'ink-look', points: 204000 },
    ]);

Set \`SAVE_VERSION = 3\`, retain \`SAVE_KEY\`, and add exact defaults:

    world: { seed: Math.floor(random() * 2147483647), distance: 0, zoneIndex: 0, zones: [], history: [] },
    current: { entities: [], elapsed: 0, rush: 'drift', rushEndsAt: 0, combo: { chain: null, count: 0, multiplier: 1 }, swell: null },
    social: { relationships: {}, rumors: [], incidents: [], pursuits: [] },
    effects: { recentAwards: [] },
    progression: { points: 0, level: 1, shores: 0, finds: 0, incidents: 0 },

Normalize each nested record from the candidate, map missing \`progression.points\` to existing v2 \`progression.xp\`, and do not retain a second spendable or visible progression value. Rename the existing level helpers to \`pointsForLevel\` and \`levelForPoints\`; every award and HUD calculation uses \`progression.points\`.

- [ ] **Step 4: Run focused tests and full regression**

    node --test test/siren-data.test.mjs test/siren-state.test.mjs
    node --test test/*.test.mjs

Expected: all tests PASS; legacy fixtures load without recovery mode.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/data.mjs games/siren-shore/assets/state.mjs test/siren-data.test.mjs test/siren-state.test.mjs
    git commit -m "feat: add Siren Shore living-ocean state"

---

### Task 2: Phone-first movement and universal contextual action

**Files:**
- Create: \`games/siren-shore/assets/world.mjs\`
- Create: \`test/siren-world.test.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/index.html\`
- Modify: \`games/siren-shore/assets/styles.css\`
- Modify: \`test/siren-site.test.mjs\`

**Interfaces:**
- Produces: \`createMotionState(player)\`, \`stepMotion(motion, intent, dt, bounds)\`, \`ensureActiveZones(world, random)\`, \`nearestActionable(player, entities, npcs, radius)\`, \`shouldHandleActionKey(event, sheetOpen)\`, and \`createInputController(...)\`.
- Consumes: v3 \`state.player\` and active runtime entities.

- [ ] **Step 1: Write failing movement and input tests**

    test('movement accelerates, glides, and decelerates inside bounds', () => {
      let motion = createMotionState({ x: 100, y: 100 });
      motion = stepMotion(motion, { x: 1, y: 0 }, 0.1, { width: 390, height: 844 });
      assert.ok(motion.vx > 0);
      const released = stepMotion(motion, { x: 0, y: 0 }, 0.1, { width: 390, height: 844 });
      assert.ok(released.x > motion.x);
      assert.ok(released.vx < motion.vx);
    });

    test('Space fires one world action and suppresses key repeat', () => {
      assert.equal(shouldHandleActionKey({ key: ' ', repeat: false, target: { tagName: 'BODY' } }, false), true);
      assert.equal(shouldHandleActionKey({ key: ' ', repeat: true, target: { tagName: 'BODY' } }, false), false);
    });

    test('Space does not trigger the ocean behind a dialog or form control', () => {
      assert.equal(isWorldActionAllowed({ tagName: 'SELECT' }, true), false);
      assert.equal(isWorldActionAllowed({ tagName: 'BODY' }, true), false);
      assert.equal(isWorldActionAllowed({ tagName: 'BODY' }, false), true);
    });

    test('world streaming keeps previous, current, and next zones only', () => {
      const world = ensureActiveZones({ seed: 7, zoneIndex: 4, zones: [], history: [] }, () => 0.25);
      assert.deepEqual(world.zones.map(({ index }) => index), [3, 4, 5]);
    });

- [ ] **Step 2: Run focused tests and confirm red**

    node --test test/siren-world.test.mjs test/siren-site.test.mjs

Expected: FAIL because \`world.mjs\`, inertia, Space handling, and dialog protection are absent.

- [ ] **Step 3: Implement motion and action gating**

Use these exported contracts:

    export function createMotionState(player) {
      return { x: player.x, y: player.y, vx: 0, vy: 0, banking: 0 };
    }

    export function stepMotion(motion, intent, dt, bounds) {
      const acceleration = 620;
      const drag = Math.pow(0.12, dt);
      const vx = (motion.vx + intent.x * acceleration * dt) * drag;
      const vy = (motion.vy + intent.y * acceleration * dt) * drag;
      return {
        x: Math.max(36, Math.min(bounds.width - 36, motion.x + vx * dt)),
        y: Math.max(72, Math.min(bounds.height - 72, motion.y + vy * dt)),
        vx,
        vy,
        banking: Math.max(-1, Math.min(1, vx / 240)),
      };
    }

In \`app.mjs\`, export \`isWorldActionAllowed(target, sheetOpen)\` and \`shouldHandleActionKey(event, sheetOpen)\`. Treat \`' '\` and \`'Spacebar'\` as contextual action keys, call \`preventDefault()\`, ignore \`event.repeat\`, and reject input originating from \`BUTTON\`, \`INPUT\`, \`SELECT\`, \`TEXTAREA\`, or an open sheet. Keep E, Z, and Enter as secondary bindings.

\`ensureActiveZones\` creates deterministic previous/current/next zone records, summarizes significant incidents and named possessions before retiring older zones, and substitutes the first \`ZONE_DEFINITIONS\` entry if generated zone data is invalid.

Change the contextual button copy to two lines driven by the active target: \`CLAIM / TREASURE\`, \`APPROACH / MERMAID\`, or \`CALL / INTO THE DARK\`.

- [ ] **Step 4: Run focused and full tests**

    node --test test/siren-world.test.mjs test/siren-site.test.mjs
    node --test test/*.test.mjs

Expected: PASS with the existing joystick preserved and Space protected from repeat and sheets.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/world.mjs games/siren-shore/assets/app.mjs games/siren-shore/index.html games/siren-shore/assets/styles.css test/siren-world.test.mjs test/siren-site.test.mjs
    git commit -m "feat: add fluid mobile movement and Space action"

---

### Task 3: Falling Treasure Current and semantic collection

**Files:**
- Create: \`games/siren-shore/assets/current.mjs\`
- Create: \`test/siren-current.test.mjs\`
- Modify: \`games/siren-shore/assets/game.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/render.mjs\`

**Interfaces:**
- Produces: \`spawnTier(roll)\`, \`spawnCurrentEntity(state, random, viewport)\`, \`stepCurrent(state, dt, viewport, random)\`, \`selectCurrentTarget(player, entities, radius)\`, \`performSirenCall(state, player, entities)\`, and \`collectCurrentEntity(state, entityId)\`.
- Emits: \`pickup\`, \`rarePickup\`, \`targetChanged\`, and \`currentRetired\` events.

- [ ] **Step 1: Write failing current tests**

    function currentStateWith(entity) {
      const state = createDefaultState(() => 0.25);
      state.mode = 'ocean';
      state.current.entities = [entity];
      return state;
    }

    test('spawned treasure enters above the portrait viewport and falls downward', () => {
      const state = createDefaultState(() => 0.25);
      const entity = spawnCurrentEntity(state, () => 0.25, { width: 390, height: 844 });
      assert.equal(entity.kind, 'treasure');
      assert.ok(entity.y < 0);
      assert.ok(entity.vy > 0);
      assert.ok(entity.shape);
    });

    test('nearest target chooses one actionable entity inside the radius', () => {
      const target = selectCurrentTarget({ x: 100, y: 100 }, [
        { id: 'far', x: 280, y: 100, actionable: true },
        { id: 'near', x: 120, y: 100, actionable: true },
      ], 70);
      assert.equal(target.id, 'near');
    });

    test('collection transfers provenance and awards permanent points', () => {
      const state = currentStateWith({
        id: 'coin-entity', kind: 'treasure', archetypeId: 'coin', shape: 'coin',
        chain: 'gold', points: 4006, actionable: true,
        item: { id: 'coin-item', name: 'Municipal Gold Coin', slot: 'treasure', ownerId: null, history: [] },
      });
      const result = collectCurrentEntity(state, state.current.entities[0].id);
      assert.equal(result.state.progression.points, 4006);
      assert.equal(result.state.inventory[0].ownerId, 'player');
      assert.match(result.state.inventory[0].history.at(-1), /Treasure Current/);
      assert.equal(result.events[0].type, 'pickup');
    });

    test('Siren Call reveals nearby concealed treasure when no target is active', () => {
      const state = currentStateWith({
        id: 'hidden-1', kind: 'treasure', tier: 'concealed', revealed: false,
        x: 0, y: 0, actionable: false,
      });
      state.current.entities[0].x = state.player.x + 100;
      state.current.entities[0].y = state.player.y;
      const result = performSirenCall(state, state.player, state.current.entities);
      assert.equal(result.state.current.entities[0].revealed, true);
      assert.ok(result.events.some(({ type }) => type === 'sirenCall'));
    });

    test('spawn tiers preserve the ambient, concealed, legendary rhythm', () => {
      assert.equal(spawnTier(0.10), 'ambient');
      assert.equal(spawnTier(0.85), 'concealed');
      assert.equal(spawnTier(0.97), 'legendary');
    });

- [ ] **Step 2: Run the current tests and confirm red**

    node --test test/siren-current.test.mjs

Expected: FAIL because \`current.mjs\` does not exist.

- [ ] **Step 3: Implement deterministic spawning and collection**

Use current entities shaped as:

    {
      id: 'current-17',
      kind: 'treasure',
      archetypeId: 'coin',
      shape: 'coin',
      chain: 'gold',
      x: 184,
      y: -32,
      vx: 7,
      vy: 92,
      points: 4006,
      actionable: true,
      item: generateItem(random, context),
    }

\`stepCurrent\` advances entities, spawns according to drift/rush density, and retires common offscreen objects. \`collectCurrentEntity\` delegates authoritative inventory and point mutation to a new \`acquireCurrentItem(input, entity)\` transition in \`game.mjs\`.

\`spawnTier(roll)\` uses exact bands of \`0 <= roll < 0.80\` ambient, \`0.80 <= roll < 0.95\` concealed, and \`0.95 <= roll <= 1\` legendary. \`performSirenCall\` reveals concealed objects inside 240 CSS pixels, emits one pulse event, and may mark a nearby NPC as curious without creating a cooldown resource.

Render each \`shape\` with a distinct path rather than the current generic diamond. The selected entity receives a halo, upward bob, name label, and stronger outline.

- [ ] **Step 4: Run current, game, render, and regression tests**

    node --test test/siren-current.test.mjs test/siren-game.test.mjs test/siren-render.test.mjs
    node --test test/*.test.mjs

Expected: PASS; existing static shore finds remain migratable but new outings use the Treasure Current.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/current.mjs games/siren-shore/assets/game.mjs games/siren-shore/assets/app.mjs games/siren-shore/assets/render.mjs test/siren-current.test.mjs test/siren-game.test.mjs test/siren-render.test.mjs
    git commit -m "feat: add the falling Treasure Current"

---

### Task 4: Combinations, Treasure Rushes, and enormous points

**Files:**
- Modify: \`games/siren-shore/assets/current.mjs\`
- Modify: \`games/siren-shore/assets/game.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/index.html\`
- Modify: \`games/siren-shore/assets/styles.css\`
- Modify: \`test/siren-current.test.mjs\`
- Modify: \`test/siren-game.test.mjs\`

**Interfaces:**
- Produces: \`advanceCombination(combo, entity)\`, \`rushPhaseAt(current, elapsed, random)\`, and semantic \`combo\`, \`comboResolved\`, \`rushStart\`, \`rushSummary\`, and \`pointAward\` events.

- [ ] **Step 1: Add failing combination and rush tests**

    function currentStateWithPoints(points) {
      const state = createDefaultState(() => 0.5);
      state.progression.points = points;
      return state;
    }

    test('matching categories build a multiplier and unrelated treasure resolves it without losing points', () => {
      const first = advanceCombination({ chain: null, count: 0, multiplier: 1 }, { chain: 'gold' });
      const third = advanceCombination(advanceCombination(first.combo, { chain: 'gold' }).combo, { chain: 'gold' });
      assert.equal(third.combo.count, 3);
      assert.equal(third.combo.multiplier, 2);
      const changed = advanceCombination(third.combo, { chain: 'pearl' });
      assert.equal(changed.resolved.count, 3);
      assert.deepEqual(changed.combo, { chain: 'pearl', count: 1, multiplier: 1 });
    });

    test('Treasure Rush increases density then returns to drift with a summary', () => {
      const started = rushPhaseAt({ rush: 'drift', rushEndsAt: 0 }, 60, () => 0);
      assert.equal(started.current.rush, 'rush');
      const ended = rushPhaseAt(started.current, started.current.rushEndsAt + 0.01, () => 0.5);
      assert.equal(ended.current.rush, 'drift');
      assert.ok(ended.events.some(({ type }) => type === 'rushSummary'));
    });

    test('lifetime Siren Points never decrease when a combination ends', () => {
      const state = currentStateWithPoints(500000);
      const result = resolveCombination(state, { chain: 'gold', count: 4, multiplier: 3 });
      assert.ok(result.state.progression.points >= 500000);
    });

- [ ] **Step 2: Run focused tests and confirm red**

    node --test test/siren-current.test.mjs test/siren-game.test.mjs

Expected: FAIL because combination and rush transitions are absent.

- [ ] **Step 3: Implement combination and rush transitions**

Use named thresholds:

    const COMBO_LABELS = {
      gold: ['GILDED', 'LIQUID ASSETS', 'UNEXPLAINED WEALTH'],
      pearl: ['STRING OF LIES', 'CLUTCHED PEARLS', 'OYSTER LIABILITY'],
      jewelry: ['OVERACCESSORIZED', 'ESTATE PROBLEM', 'REGULATED LUXURY EVENT'],
      junk: ['FOUND OBJECT', 'CURATED DEBRIS', 'MUNICIPAL COLLECTION'],
      couture: ['DRESSED FOR COURT', 'TEXTILE INCIDENT', 'UNSUPERVISED GLAMOUR'],
    };

Start in drift. Schedule rushes through a randomized 45–90 second window, run them for 15–25 seconds, raise spawn density without blocking navigation, and generate a short summary from counters gathered during the rush.

Add persistent HUD nodes: \`#points-value\`, \`#combo-label\`, \`#combo-count\`, and \`#rush-banner\`. Update them through event dispatch rather than rebuilding the full UI on every animation frame.

- [ ] **Step 4: Run focused and full tests**

    node --test test/siren-current.test.mjs test/siren-game.test.mjs test/siren-site.test.mjs
    node --test test/*.test.mjs

Expected: PASS; score never decrements and rush timing is deterministic under injected randomness.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/current.mjs games/siren-shore/assets/game.mjs games/siren-shore/assets/app.mjs games/siren-shore/index.html games/siren-shore/assets/styles.css test/siren-current.test.mjs test/siren-game.test.mjs test/siren-site.test.mjs
    git commit -m "feat: add Siren combinations and Treasure Rushes"

---

### Task 5: Nonlethal hazards and ocean swells

**Files:**
- Create: \`games/siren-shore/assets/hazards.mjs\`
- Create: \`test/siren-hazards.test.mjs\`
- Modify: \`games/siren-shore/assets/current.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/render.mjs\`
- Modify: \`games/siren-shore/assets/audio.mjs\`

**Interfaces:**
- Produces: \`resolveHazard(input, entityId, random)\`, \`scheduleSwell(current, elapsed, random)\`, \`stepSwell(swell, dt)\`, and \`swellForce(swell, point)\`.
- Emits: \`hazard\`, \`itemReleased\`, \`lookChanged\`, \`swellWarning\`, \`swellStart\`, \`swellImpact\`, and \`swellEnd\`.

- [ ] **Step 1: Write failing hazard and swell tests**

    function hazardState(archetypeId = 'jellyfish') {
      const state = createDefaultState(() => 0.5);
      state.mode = 'ocean';
      const item = { id: 'bag-item', name: 'Disputed Bag', slot: 'purse', ownerId: 'player', history: [] };
      state.inventory.push(item);
      state.purseIds.push(item.id);
      state.current.entities.push({ id: archetypeId + '-1', kind: 'hazard', archetypeId, x: state.player.x, y: state.player.y });
      return state;
    }

    test('jellyfish releases one carried object without deleting its provenance', () => {
      const state = hazardState('jellyfish');
      const result = resolveHazard(state, 'jelly-1', () => 0);
      const item = result.state.inventory.find(({ id }) => id === state.purseIds[0]);
      assert.equal(item.ownerId, null);
      assert.equal(result.state.purseIds.length, 0);
      assert.match(item.history.at(-1), /jellyfish/);
    });

    test('eel changes temporary hair state and awards poor-judgment points', () => {
      const state = hazardState('eel');
      const result = resolveHazard(state, 'eel-1', () => 0.5);
      assert.equal(result.state.player.effects.hair, 'electric');
      assert.ok(result.state.progression.points > state.progression.points);
    });

    test('swell warns before applying bounded force and always ends', () => {
      const scheduled = scheduleSwell({ swell: null }, 120, () => 0);
      assert.equal(scheduled.swell.phase, 'warning');
      const active = stepSwell(scheduled.swell, 4.1);
      assert.equal(active.phase, 'active');
      const ended = stepSwell(active, 9);
      assert.equal(ended, null);
    });

- [ ] **Step 2: Run focused tests and confirm red**

    node --test test/siren-hazards.test.mjs

Expected: FAIL because \`hazards.mjs\` does not exist.

- [ ] **Step 3: Implement recoverable hazards and swell phases**

Use a four-second warning, six-to-ten-second active phase, and irregular two-to-four-minute scheduling. Swell direction and strength derive from the injected random source and clamp player/NPC displacement inside the active viewport.

Hazard effects:

    const HAZARD_RESOLVERS = {
      jellyfish: releaseCarriedItem,
      eel: applyElectricHair,
      squid: applyInkLook,
    };

Released items return to the active current as actionable treasure with their existing item record. Visual warnings combine shape, motion, copy, and audio; reduced-motion uses directional tint and static edge pressure instead of screen displacement.

- [ ] **Step 4: Run hazard, current, audio, render, and full tests**

    node --test test/siren-hazards.test.mjs test/siren-current.test.mjs test/siren-audio.test.mjs test/siren-render.test.mjs
    node --test test/*.test.mjs

Expected: PASS with no health, death, deleted item, or negative point transition.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/hazards.mjs games/siren-shore/assets/current.mjs games/siren-shore/assets/app.mjs games/siren-shore/assets/render.mjs games/siren-shore/assets/audio.mjs test/siren-hazards.test.mjs test/siren-current.test.mjs test/siren-audio.test.mjs test/siren-render.test.mjs
    git commit -m "feat: add glamorous hazards and ocean swells"

---

### Task 6: Rival treasure pursuit and reciprocal theft

**Files:**
- Create: \`games/siren-shore/assets/social.mjs\`
- Create: \`test/siren-social.test.mjs\`
- Modify: \`games/siren-shore/assets/game.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/render.mjs\`

**Interfaces:**
- Produces: \`chooseNpcTarget(npc, entities, state)\`, \`stepNpcPursuit(npcRuntime, target, dt)\`, \`resolveContestedPickup(input, npcId, entityId, random)\`, \`attemptNpcTheft(input, npcId, random)\`, and \`transferPossession(input, itemId, fromId, toId, note)\`.
- Consumes: current entities, NPC temperament, preference, rivalry, possessions, and player purse.

- [ ] **Step 1: Write failing competition and theft tests**

    function socialFixture() {
      const state = createDefaultState(() => 0.5);
      state.mode = 'ocean';
      state.current.entities = [{
        id: 'crown-entity', kind: 'treasure', archetypeId: 'crown', shape: 'crown',
        item: { id: 'crown-item', name: 'Disputed Crown', slot: 'crown', ownerId: null, history: [] },
        points: 388000, x: 180, y: 100, actionable: true,
      }];
      const packed = { id: 'packed-1', name: 'Pearl Liability', slot: 'jewelry', ownerId: 'player', history: [] };
      state.inventory.push(packed);
      state.purseIds.push(packed.id);
      return state;
    }

    test('NPC targets preferred treasure before lower-value unrelated treasure', () => {
      const npc = { id: 'cynthia', preference: 'crown', x: 100, y: 100 };
      const target = chooseNpcTarget(npc, [
        { id: 'coin', archetypeId: 'coin', x: 110, y: 100, points: 4006 },
        { id: 'crown', archetypeId: 'crown', x: 180, y: 100, points: 388000 },
      ], socialFixture());
      assert.equal(target.id, 'crown');
    });

    test('NPC collection persists the object in her inventory', () => {
      const result = resolveContestedPickup(socialFixture(), 'cynthia', 'crown-entity', () => 0);
      const crown = result.state.inventory.find(({ id }) => id === result.events[0].itemId);
      assert.equal(crown.ownerId, 'cynthia');
      assert.ok(result.state.npcs.cynthia.possessions.includes(crown.id));
    });

    test('NPC theft and player recovery preserve one object and append history', () => {
      const stolen = attemptNpcTheft(socialFixture(), 'cynthia', () => 0);
      const recovered = transferPossession(stolen.state, stolen.events[0].itemId, 'cynthia', 'player', 'Recovered publicly.');
      assert.equal(recovered.state.inventory.filter(({ id }) => id === stolen.events[0].itemId).length, 1);
      assert.equal(recovered.state.inventory.find(({ id }) => id === stolen.events[0].itemId).history.length, 2);
    });

- [ ] **Step 2: Run focused tests and confirm red**

    node --test test/siren-social.test.mjs test/siren-game.test.mjs

Expected: FAIL because reciprocal pursuit and ownership transitions are absent.

- [ ] **Step 3: Implement rival intent and shared transfer authority**

Move the existing private \`transfer\` helper from \`game.mjs\` into an exported \`transferPossession(input, itemId, fromId, toId, note)\` transition that enforces one owner and one inventory record. Update encounters and fights to consume it.

NPC runtime intent uses:

    { npcId, targetId: null, mode: 'drift', vx: 0, vy: 0, frustration: 0 }

NPCs choose visible targets by preference, value, distance, and rivalry. When player and NPC reach the same item, \`resolveContestedPickup\` uses position advantage plus temperament and injected randomness. Collision produces a short displacement and event, never damage.

- [ ] **Step 4: Run social, game, current, and full tests**

    node --test test/siren-social.test.mjs test/siren-game.test.mjs test/siren-current.test.mjs
    node --test test/*.test.mjs

Expected: PASS; one durable item survives every collect, steal, drop, and recovery transition.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/social.mjs games/siren-shore/assets/game.mjs games/siren-shore/assets/app.mjs games/siren-shore/assets/render.mjs test/siren-social.test.mjs test/siren-game.test.mjs
    git commit -m "feat: let Siren Shore rivals collect and steal"

---

### Task 7: Autonomous Housewives-style drama

**Files:**
- Modify: \`games/siren-shore/assets/social.mjs\`
- Modify: \`games/siren-shore/assets/state.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/render.mjs\`
- Modify: \`test/siren-social.test.mjs\`
- Modify: \`test/siren-state.test.mjs\`

**Interfaces:**
- Produces: \`relationshipKey(a, b)\`, \`recordIncident(input, incident)\`, \`advanceSocialClock(input, elapsed, random)\`, \`spreadRumor(input, rumor, random)\`, and \`nextPursuit(input, zoneIndex)\`.
- Emits: \`gossip\`, \`alliance\`, \`confrontation\`, \`reconciliation\`, \`pursuit\`, and \`publicReaction\`.

- [ ] **Step 1: Write failing relationship and autonomous-scene tests**

    function heatedState(actorId, targetId, heat) {
      const state = createDefaultState(() => 0.5);
      state.social.relationships[relationshipKey(actorId, targetId)] = {
        affinity: 0, rivalry: heat, heat, alliance: false, lastIncidentId: 'incident-1',
      };
      return state;
    }

    test('relationships are directional and persist between NPCs', () => {
      const state = createDefaultState(() => 0.4);
      const result = recordIncident(state, {
        type: 'theft',
        actorId: 'cynthia',
        targetId: 'marina',
        witnesses: ['beatrice'],
        itemId: 'crown-1',
        public: true,
      });
      assert.ok(result.state.social.relationships[relationshipKey('marina', 'cynthia')].rivalry > 0);
      assert.ok(result.state.social.rumors.length > 0);
    });

    test('social clock can create a scene without player initiation', () => {
      const result = advanceSocialClock(createDefaultState(() => 0.2), 180, () => 0);
      assert.ok(result.events.some(({ type }) => ['gossip', 'confrontation', 'alliance'].includes(type)));
      assert.ok(result.state.social.incidents.length > 0);
    });

    test('high relational heat schedules a recognizable later pursuit', () => {
      const state = heatedState('cynthia', 'player', 8);
      const result = nextPursuit(state, 3);
      assert.equal(result.npcId, 'cynthia');
      assert.equal(result.reason.targetId, 'player');
    });

- [ ] **Step 2: Run social and state tests and confirm red**

    node --test test/siren-social.test.mjs test/siren-state.test.mjs

Expected: FAIL because relationship edges, rumors, incidents, and pursuits are absent.

- [ ] **Step 3: Implement bounded social simulation**

Represent edges as:

    {
      affinity: 0,
      rivalry: 0,
      heat: 0,
      alliance: false,
      lastIncidentId: null,
    }

Store at most 80 full incidents and 40 active rumors; summarize older incidents into NPC memories before retirement. Schedule social scenes irregularly every 60–180 seconds and on major treasure disputes. Every scene names actor, target, witnesses, object when relevant, public visibility, and resulting relationship deltas.

Pursuit selects from unresolved high-heat edges and introduces the known mermaid from below or the side with a clear visual and audio cue. The player may engage or swim away; either choice updates memory.

- [ ] **Step 4: Run social, state, rendering, and full tests**

    node --test test/siren-social.test.mjs test/siren-state.test.mjs test/siren-render.test.mjs
    node --test test/*.test.mjs

Expected: PASS with bounded history and deterministic scenes under injected randomness.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/social.mjs games/siren-shore/assets/state.mjs games/siren-shore/assets/app.mjs games/siren-shore/assets/render.mjs test/siren-social.test.mjs test/siren-state.test.mjs test/siren-render.test.mjs
    git commit -m "feat: add autonomous mermaid drama"

---

### Task 8: Glamour Arcade rendering and bounded effects

**Files:**
- Modify: \`games/siren-shore/assets/render.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/styles.css\`
- Modify: \`games/siren-shore/index.html\`
- Modify: \`test/siren-render.test.mjs\`
- Modify: \`test/siren-site.test.mjs\`

**Interfaces:**
- Produces: \`shapeForArchetype(archetypeId)\`, \`createEffectsPool({ reducedMotion, maxParticles })\`, \`pushEffect(pool, event)\`, and renderer methods \`setTarget(target)\`, \`consumeEvents(events)\`, and \`renderFrame(...)\`.

- [ ] **Step 1: Write failing semantic-shape and effects-bound tests**

    test('collectible archetypes map to distinct readable shapes', () => {
      assert.equal(shapeForArchetype('coin'), 'coin');
      assert.equal(shapeForArchetype('crown'), 'crown');
      assert.equal(shapeForArchetype('bag'), 'bag');
      assert.notEqual(shapeForArchetype('crown'), shapeForArchetype('bag'));
    });

    test('effects pool caps ornament before gameplay entities', () => {
      const pool = createEffectsPool({ reducedMotion: false, maxParticles: 96 });
      for (let index = 0; index < 200; index += 1) pushEffect(pool, { type: 'sparkle', x: 10, y: 10 });
      assert.equal(pool.particles.length, 96);
    });

    test('reduced motion replaces animated target pulse with static emphasis', () => {
      const pool = createEffectsPool({ reducedMotion: true, maxParticles: 96 });
      pushEffect(pool, { type: 'target', x: 20, y: 30 });
      assert.equal(pool.emphasis.at(-1).motion, 'static');
      assert.equal(pool.particles.length, 0);
    });

- [ ] **Step 2: Run render and site tests and confirm red**

    node --test test/siren-render.test.mjs test/siren-site.test.mjs

Expected: FAIL because semantic shapes and effects pool are absent.

- [ ] **Step 3: Implement the game-ready visual hierarchy**

Add Canvas path renderers for \`coin\`, \`pearl\`, \`gem\`, \`crown\`, \`bag\`, \`junk\`, \`jellyfish\`, \`eel\`, and \`squid\`. Use silhouette, interior mark, and motion pattern so meaning does not rely on color.

Cap decorative effects at 96 particles on ordinary mobile hardware and 32 under reduced motion. Allocate visual hierarchy:

    const EFFECT_INTENSITY = {
      pickup: 1,
      combo: 2,
      rarePickup: 3,
      rushStart: 3,
      swellStart: 2,
      legendary: 4,
    };

Implement three parallax layers, restrained drift density, Treasure Rush escalation, target halo/name/prompt, NPC facial-reaction marks, rolling point bursts, and a brief nonblocking legendary acquisition presentation. Never obscure the active target, player silhouette, contextual control, or hazard warning.

- [ ] **Step 4: Run render, site, and full tests**

    node --test test/siren-render.test.mjs test/siren-site.test.mjs
    node --test test/*.test.mjs

Expected: PASS; reduced motion and semantic shape rules remain testable without pixel snapshots.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/render.mjs games/siren-shore/assets/app.mjs games/siren-shore/assets/styles.css games/siren-shore/index.html test/siren-render.test.mjs test/siren-site.test.mjs
    git commit -m "feat: add Glamour Arcade visual feedback"

---

### Task 9: Pickup score ladder, rush mix, and optional haptics

**Files:**
- Create: \`games/siren-shore/assets/haptics.mjs\`
- Create: \`test/siren-haptics.test.mjs\`
- Modify: \`games/siren-shore/assets/audio.mjs\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`test/siren-audio.test.mjs\`
- Modify: \`.github/workflows/pages.yml\`

**Interfaces:**
- Produces: \`audio.playPickup({ category, combo, rarity })\`, \`audio.consumeEvent(event)\`, \`createHapticsController({ vibrate, enabled })\`, and \`haptics.consumeEvent(event)\`.

- [ ] **Step 1: Write failing audio-ladder and haptic tests**

    test('pickup pitch rises with combo count and varies by category', async () => {
      const context = fakeContext();
      const audio = createAudioController({ audioContextFactory: () => context, audioFactory: () => fakeTrack(), soundtrackUrl: 'score.mp3' });
      await audio.unlock();
      audio.playPickup({ category: 'coin', combo: 1, rarity: 1 });
      audio.playPickup({ category: 'coin', combo: 4, rarity: 1 });
      const frequencies = context.calls.filter(([type]) => type === 'frequency').map(([, value]) => value);
      assert.ok(frequencies.at(-1) > frequencies[0]);
    });

    test('haptics are optional and unsupported devices remain playable', () => {
      const calls = [];
      const active = createHapticsController({ vibrate: (pattern) => calls.push(pattern), enabled: true });
      active.consumeEvent({ type: 'rarePickup' });
      assert.deepEqual(calls[0], [18, 24, 34]);
      assert.doesNotThrow(() => createHapticsController({ vibrate: null, enabled: true }).consumeEvent({ type: 'pickup' }));
    });

- [ ] **Step 2: Run audio and haptics tests and confirm red**

    node --test test/siren-audio.test.mjs test/siren-haptics.test.mjs

Expected: FAIL because the category ladder, event consumer, and haptics module are absent.

- [ ] **Step 3: Implement layered procedural feedback**

Map categories to base frequencies and raise pitch by a bounded semitone ladder:

    const PICKUP_BASE = { coin: 523.25, pearl: 659.25, jewelry: 783.99, couture: 440, junk: 196 };
    const pitchForCombo = (base, combo) => base * (2 ** (Math.min(12, Math.max(0, combo - 1)) / 12));

Resolve combinations with a consonant phrase rather than a failure sound. Add distinct event handling for \`rushStart\`, \`rushSummary\`, \`swellWarning\`, \`swellStart\`, \`theft\`, \`recovery\`, and \`legendary\`. Keep gain bounded below the existing effects ceiling and preserve independent music/effects toggles.

Use short vibration patterns only after browser interaction and only when \`navigator.vibrate\` exists. Add an enabled haptics setting defaulting to true but treat denial as a silent no-op.

Add syntax checks for \`world.mjs\`, \`current.mjs\`, \`hazards.mjs\`, \`social.mjs\`, and \`haptics.mjs\` to the Pages workflow.

- [ ] **Step 4: Run media, audio, haptics, syntax, and full tests**

    node --test test/siren-audio.test.mjs test/siren-haptics.test.mjs
    node --check games/siren-shore/assets/world.mjs
    node --check games/siren-shore/assets/current.mjs
    node --check games/siren-shore/assets/hazards.mjs
    node --check games/siren-shore/assets/social.mjs
    node --check games/siren-shore/assets/haptics.mjs
    python3 scripts/generate_siren_score.py --check
    node --test test/*.test.mjs

Expected: PASS with sound still locked behind the entry gesture.

- [ ] **Step 5: Commit**

    git add games/siren-shore/assets/haptics.mjs games/siren-shore/assets/audio.mjs games/siren-shore/assets/app.mjs test/siren-haptics.test.mjs test/siren-audio.test.mjs .github/workflows/pages.yml
    git commit -m "feat: add Siren score ladder and haptics"

---

### Task 10: Cabinet of Allegations and richer Siren Receipts

**Files:**
- Modify: \`games/siren-shore/index.html\`
- Modify: \`games/siren-shore/assets/app.mjs\`
- Modify: \`games/siren-shore/assets/share.mjs\`
- Modify: \`games/siren-shore/assets/styles.css\`
- Modify: \`test/siren-share.test.mjs\`
- Modify: \`test/siren-site.test.mjs\`

**Interfaces:**
- Produces: \`createCabinetModel(state)\` and expanded \`createReceiptModel(state)\`.
- Consumes: provenance, social incidents, rumors, points, title, current look, and last disputed possession.

- [ ] **Step 1: Write failing cabinet and receipt tests**

    function stateWithSocialHistory() {
      const state = createDefaultState(() => 0.5);
      state.progression.points = 1200000;
      state.inventory.push({
        id: 'crown-1', name: 'Disputed Crown', slot: 'crown', ownerId: 'player',
        history: ['Found by Cynthia.', 'Taken by Your Majesty.'], colors: ['#ffd95e', '#ff4faf'],
      });
      state.equipped.crown = 'crown-1';
      state.social.incidents.push({
        id: 'incident-1', type: 'theft', actorId: 'player', targetId: 'cynthia',
        itemId: 'crown-1', text: 'Your Majesty stole the Disputed Crown from Cynthia.',
      });
      state.lastIncident = state.social.incidents[0];
      return state;
    }

    test('cabinet preserves allegations without requiring completion', () => {
      const model = createCabinetModel(stateWithSocialHistory());
      assert.equal(model.points, 1200000);
      assert.equal(model.objects[0].history.length, 2);
      assert.equal(model.mermaids[0].name, 'Cynthia Undertow');
      assert.match(model.incidents[0].text, /stole/i);
      assert.equal('completionPercent' in model, false);
    });

    test('receipt includes points, featured possession, and disputed account', () => {
      const model = createReceiptModel(stateWithSocialHistory());
      assert.equal(model.pointsLabel, '1,200,000 SIREN POINTS');
      assert.ok(model.featuredItem);
      assert.match(model.allegation, /disputes this account/i);
    });

- [ ] **Step 2: Run share and site tests and confirm red**

    node --test test/siren-share.test.mjs test/siren-site.test.mjs

Expected: FAIL because the cabinet model and expanded receipt fields are absent.

- [ ] **Step 3: Implement optional history browsing and share output**

Add \`#cabinet-sheet\` with tabs for Things, Mermaids, and Incidents. Render concise entries from bounded state records; do not add badges, incomplete counts, red dots, or collection percentages.

Update the receipt canvas to display:

    model.title
    model.pointsLabel
    model.featuredItem.name
    model.lastIncident
    model.allegation
    public game URL

Preserve Web Share API first, download fallback second, clipboard fallback third, and never serialize local history into the public URL.

- [ ] **Step 4: Run share, site, and full tests**

    node --test test/siren-share.test.mjs test/siren-site.test.mjs
    node --test test/*.test.mjs

Expected: PASS with no completion pressure and no private-state transmission.

- [ ] **Step 5: Commit**

    git add games/siren-shore/index.html games/siren-shore/assets/app.mjs games/siren-shore/assets/share.mjs games/siren-shore/assets/styles.css test/siren-share.test.mjs test/siren-site.test.mjs
    git commit -m "feat: add the Cabinet of Allegations"

---

### Task 11: Mobile release verification and publication

**Files:**
- Modify: \`README.md\`
- Modify: \`.github/workflows/pages.yml\`
- Modify: \`test/siren-site.test.mjs\`

**Interfaces:**
- Consumes: every module and public route.
- Produces: one verified GitHub Pages release at \`https://cognitive-studio.github.io/share/games/siren-shore/\`.

- [ ] **Step 1: Add failing release-contract assertions**

Extend \`test/siren-site.test.mjs\` so the public shell requires \`points-value\`, \`combo-label\`, \`rush-banner\`, \`swell-banner\`, \`cabinet-sheet\`, contextual action controls, safe-area CSS, reduced-motion CSS, and local references to every new module.

- [ ] **Step 2: Run the release test and confirm red**

    node --test test/siren-site.test.mjs

Expected: FAIL if any mobile shell, workflow check, module reference, or documentation contract is missing.

- [ ] **Step 3: Complete release documentation and workflow checks**

Document the mobile control contract in \`README.md\`:

    - Drag the pearl control to swim.
    - Tap the contextual button to claim, approach, or call.
    - Treasure Rushes and swells end without failure.
    - Progress persists locally on the device.
    - Sound requires the opening touch; haptics depend on device support.

Ensure the Pages workflow checks every JavaScript module, validates the original score, and runs all tests before deployment.

- [ ] **Step 4: Run the complete automated gate**

    node --test test/*.test.mjs
    for file in games/siren-shore/assets/*.mjs; do node --check "$file"; done
    python3 scripts/generate_siren_score.py --check
    git diff --check

Expected: all tests PASS, every module parses, the score verifies, and no whitespace errors remain.

- [ ] **Step 5: Perform the mobile-only acceptance pass**

Serve the repository locally:

    python3 -m http.server 4173

At an iPhone portrait viewport, complete this exact flow:

1. Enter with sound and confirm music begins only after the tap.
2. Customize the mermaid and enter the ocean without horizontal scrolling.
3. Steer one-handed; release and confirm aquatic glide stops predictably.
4. Approach three distinct treasure shapes and verify the active target visibly changes.
5. Collect with the contextual button and confirm category sound, sparkle, haptic when supported, rolling points, and provenance.
6. Build and resolve one combination without losing lifetime points.
7. Experience a Treasure Rush and confirm the screen remains readable and responsive.
8. Hit one hazard and confirm there is no health, death, or blocked continuation.
9. Experience a swell warning and active swell; confirm the player can still steer.
10. Lose an item to a mermaid, encounter her wearing it, and recover or decline to recover it.
11. Observe one NPC-to-NPC incident without initiating it.
12. Open the Cabinet and receipt; confirm neither exposes local history in the URL.
13. Background and resume the browser; confirm audio and animation recover.
14. Reload; confirm v3 state and accumulated points persist.
15. Enable reduced motion; confirm targets and warnings remain legible without pulsing movement.

Record any device-specific defects as failing automated tests before fixing them.

- [ ] **Step 6: Commit the release gate**

    git add README.md .github/workflows/pages.yml test/siren-site.test.mjs
    git commit -m "docs: add Siren Shore mobile release gate"

- [ ] **Step 7: Review, merge, deploy, and verify**

Push the implementation branch, open a pull request against \`main\`, run the repository review workflow, merge only after every check passes, wait for the Pages workflow, then verify the live URL on an iPhone. Confirm the first public session and a returning saved session.

---

## Milestone checkpoints

- **After Task 4:** mobile arcade loop is playable—glide, Space/touch action, semantic falling treasure, combinations, Rushes, and huge points.
- **After Task 7:** the ocean has consequence—hazards, swells, reciprocal theft, autonomous drama, and returning rivals.
- **After Task 10:** the experience has full presentation and memory—Glamour Arcade feedback, score ladder, haptics, Cabinet, and receipts.
- **After Task 11:** the live GitHub Pages build has passed the mobile-only acceptance gate.
