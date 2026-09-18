# Siren Shore — Mobile Public Edition Design

**Date:** September 18, 2026  
**Status:** Approved for implementation planning  
**Repository:** `cognitive-studio/share`  
**Public route:** `/share/games/siren-shore/`  
**Canonical concept source:** `cognitive-studio/aw-siren-shore`

## Product statement

Siren Shore is an endless, single-player mermaid collecting game for the queen inside everyone.

The player swims through a beautiful ocean, collects gorgeous and indefensible objects, authors an increasingly impossible mermaid, and becomes involved in completely optional drag-queen drama with persistent NPC mermaids. There is no campaign to finish, kingdom to save, fashion score to optimize, or moral lesson to learn.

The governing play loop is:

> Get fabulous → pack a purse → enter the ocean → find something → meet a bitch → decide whether today is peaceful → gain or lose something memorable → return home → reinvent yourself → repeat forever.

The governing product test is:

> Did I collect something fabulous, and did some mermaid make it weird?

## Audience

The audience is not limited to players who already like mermaids or drag. It is the queen inside anyone who wants a beautiful, low-pressure place to collect strange things, express themselves, and initiate or avoid ridiculous social conflict.

The experience must be immediately understandable, welcoming, camp, adult without being explicit, and playable for four minutes or four hours.

## Release architecture

The polished public edition will live in `cognitive-studio/share/games/siren-shore/`. The existing `cognitive-studio/aw-siren-shore` repository remains the concept archive and prototype source.

The public edition is a self-contained static browser game:

- no framework or compilation step;
- no account, backend, analytics, or remote assets;
- relative asset paths compatible with GitHub Pages;
- ES modules separated by responsibility;
- browser local storage for persistence;
- Canvas for ocean play and share-card rendering;
- DOM overlays for accessible controls, inventory, encounters, and settings.

Expected modules:

- `index.html` — semantic shell and social metadata;
- `assets/styles.css` — phone-first layout, safe areas, visual system, and responsive states;
- `assets/data.mjs` — object vocabularies, rarity, NPC personalities, dialogue, and generated nonsense;
- `assets/state.mjs` — versioned save schema, migration, persistence, and deterministic helpers;
- `assets/game.mjs` — collection, progression, encounters, provenance, relationships, and endless shore generation;
- `assets/render.mjs` — Canvas ocean and mermaid rendering;
- `assets/audio.mjs` — soundtrack and sound-effect controller;
- `assets/share.mjs` — Siren Receipt generation and native sharing;
- `assets/app.mjs` — input, view coordination, and lifecycle.

The modules may be consolidated only where doing so makes behavior clearer and does not recreate the current single-file coupling.

## Phone-first interaction

Portrait phone play is the primary layout. Desktop and landscape remain supported.

- A thumb joystick controls swimming.
- A large contextual button handles nearby finds and mermaids.
- Home, purse, wardrobe, encounter, and provenance interfaces use bottom sheets.
- All primary targets are at least 44 CSS pixels.
- Layout respects `env(safe-area-inset-*)`.
- Touch gestures suppress accidental page scrolling and text selection only inside the play surface.
- Keyboard controls remain available for desktop.
- The player can pause, mute, return home, and share without losing state.
- Reduced-motion preferences remove nonessential bobbing, flashes, and transitions.
- Text and controls maintain readable contrast over the ocean.

There is no mandatory tutorial sequence. The first grotto screen teaches the loop through three visible actions: alter the look, pack the purse, and enter the ocean.

## Endless collection system

Collecting is the primary game.

Items are assembled from combinatorial vocabularies covering condition, material, cultural pretension, object type, emotional liability, and provenance. The generator must continue producing new combinations without a finite catalog completion state.

Every item has:

- stable ID;
- generated name and description;
- category and wearable slot;
- visual traits;
- rarity as flavor rather than objective worth;
- current owner;
- origin shore and acquisition method;
- append-only provenance history;
- remix ancestry when created from other objects.

Acquisition lanes remain Finds, Creations, and Spoils. Objects may be worn, stored safely at home, carried at risk, traded, snatched, lost, recovered, remixed, displayed, or sold. Home storage is uncapped for this edition. Purse capacity creates outing-level choices without preventing indefinite collection.

Examples should reach the tone of “emotionally unavailable tiara,” “ceremonial motel ashtray,” and “counterfeit aristocratic handbag” without relying on a small list of repeated jokes.

## Mermaid authorship

The player can continuously alter hair, scales, tail, fins, makeup, jewelry, purse, weapon, and wearable finds.

Presentation has no score and no optimal build. Clothing and objects may affect encounter dialogue or what can be lost, but never establish a correct appearance.

The mermaid preview must update immediately and remain visually legible at phone size.

## Persistent social drama

Named NPC mermaids retain:

- friendship;
- rivalry;
- cattiness;
- power;
- wins and losses;
- possessions;
- encounter memory;
- specific grievances involving objects.

Encounter choices are compliment, trade, shade, snatch, fight, and leave.

Nonlethal combat uses SNATCH, READ, and FLOURISH. It rearranges possessions, reputation, and composure rather than health. Outcomes should be brief, funny, and materially persistent. An NPC who loses an object can recognize it later when the player wears it.

The game never requires conflict. Solitude and collecting remain complete play states.

## Progression

Siren Level is uncapped.

Legend XP comes from exploration, finds, remixes, encounters, trades, spoils, and altercations. Increasing levels expand possibility rather than invalidate older possessions:

- stranger item language;
- additional visual combinations;
- more complicated NPC reactions;
- increasingly dramatic titles;
- rarer encounter structures;
- higher social stakes;
- new shore moods.

The XP curve grows indefinitely without requiring a server or daily attendance. There are no streaks, chores, energy timers, or punishment for leaving.

## Soundtrack and effects

Audio begins only after explicit player interaction to satisfy mobile browser policies.

The soundtrack is an original, locally hosted, looping composition with melody, rhythm, aquatic atmosphere, and camp theatrical movement. It must read as music rather than a sustained ambient tone. The mix should support long play without becoming exhausting.

Sound effects distinguish:

- entering the ocean;
- common and rare discoveries;
- equipping and packing;
- compliments and trades;
- shade and reads;
- snatches and possession changes;
- victories, losses, and level-ups;
- returning to the grotto;
- successful sharing.

Music and effects have separate visible controls. Preferences persist. Failure to initialize audio never blocks play.

## Siren Receipts

Players can create shareable image cards at any time and are also offered a receipt after especially funny discoveries or incidents.

A receipt combines:

- rendered mermaid portrait;
- current title and Siren Level;
- featured object or incident;
- provenance excerpt;
- offended or implicated NPC;
- an editorial headline and disgraceful caption;
- the public game URL.

The card is rendered locally to Canvas as a PNG. On supported phones, the Web Share API shares the image file and text. Fallback behavior downloads the PNG and copies or shares the clean game URL. Canceling the native share sheet is not treated as an error.

No personal data, save file, or full inventory is uploaded.

## Public shelf integration

The root Share shelf becomes a collection of “games, quizzes, and highly specific nonsense.”

It gains a Siren Shore launch card and updates its experience count. The repository README documents the new route. The Pages workflow validates all Siren Shore modules before deployment.

## State, resilience, and privacy

The save schema is versioned. Invalid or unavailable local storage falls back to a playable in-memory session and shows a concise warning. Corrupt saves are preserved under a recovery key before a fresh state is created.

The game never transmits play history. A reset action requires confirmation and clearly states that local progress will be removed.

Canvas resizing, orientation changes, backgrounding, and audio suspension must not destroy state.

## Testing and acceptance

Automated tests must cover:

- route and relative asset integrity;
- absence of remote runtime dependencies;
- JavaScript syntax;
- default state and save migration;
- endless item generation without invalid records;
- provenance updates across find, trade, snatch, loss, recovery, and remix;
- persistent NPC relationship changes;
- uncapped level calculations;
- mobile controls and safe-area CSS hooks;
- audio activation only after gesture and independent mute state;
- Siren Receipt generation and share fallbacks;
- root shelf and README integration.

Manual acceptance uses current iPhone Safari dimensions and desktop Chrome:

1. Create a mermaid, pack a purse, and enter the ocean without a keyboard.
2. Swim, collect an item, encounter an NPC, and complete one social action.
3. Return home, store or wear the item, reload, and verify persistence.
4. Re-encounter a known NPC and observe remembered history.
5. Hear musical scoring and distinct interaction effects after enabling sound.
6. Generate and share or download a Siren Receipt.
7. Continue onto another procedurally generated shore without reaching an ending.
8. Verify the deployed GitHub Pages route after merge.

## Explicit exclusions

This release does not include multiplayer, accounts, cloud saves, leaderboards, monetization, daily challenges, a finite collection checklist, a story campaign, lethal combat, fashion ranking, remote AI generation, or installable native applications.

## Release outcome

A person should be able to open a shared link on an iPhone, become a mermaid, collect something ludicrous, start or avoid drama, hear a real soundtrack, produce a shareable receipt, close the tab, and return later to the same accumulated nonsense.
