# Siren Shore: Living Ocean Design

**Status:** Approved direction; implementation design awaiting final review  
**Date:** 2026-09-18

## Product contract

Siren Shore is an endless oceanic glamour sandbox. The player is a fabulous bitch for however long they are in that world.

The game does not prescribe an emotional transformation, demand mastery, or create an obligation to return. A player may swim, decorate their mermaid, collect beautiful nonsense, provoke other mermaids, accumulate an indefensible number of points, and leave whenever real life requires them.

The expansion must make the world feel alive without turning it into a survival game, quest log, economy, or job.

### Locked principles

- No campaign, missions, daily chores, stamina, health bar, death, or game-over state.
- No required conflict. Solitude and collecting remain complete play states.
- No scarce currency or optimization economy. Siren Points are abundant, permanent applause.
- No minimap, directional arrow, or objective marker. Wildlife, light, motion, sound, and social behavior guide attention.
- No finite collection checklist. The world, objects, points, levels, and social histories continue indefinitely.
- Hazards create glamorous inconvenience, altered appearance, displaced possessions, or social incidents—not punishment.
- Mermaids remember. Objects remember. The game never decides whether an object matters.

## Experience target

The current release proves swimming, collecting, customization, encounters, possession, and persistence, but the finite playfield reads as a decorated aquarium. The living-ocean release should create the feeling that the player has entered a world already in motion.

The core loop is:

> Swim upward → read the falling Treasure Current → build a combination or chase a valuable object → collide with ongoing drama → behave however you want → create consequences → continue upward.

There is no required stopping point. Every exit is valid.

The experience alternates seamlessly between two tempos:

- **Glamour Drift:** free swimming, customization, hidden treasure, gossip, theft, exploration, and low-pressure collecting.
- **Treasure Rush:** a short increase in falling objects, hazards, rivals, combinations, sound, haptics, and score feedback.

Neither tempo is a separate mode the player must select or complete. A rush celebrates whatever happened and dissolves back into the ocean without a failure screen.

## World structure: the Endless Vertical Ocean

The ocean unfolds primarily from bottom to top, which fits portrait phones and creates an intuitive sense of discovery. The player may move freely in all directions within the active view, but new environments, objects, wildlife, and social situations arrive above them.

The world is generated as a continuous sequence of named zones, including examples such as:

- Champagne Reef;
- The Sunken Mall;
- Divorce Lagoon;
- The Unlicensed Pearl District;
- a yacht wreck containing only eveningwear;
- the trench where everyone claims not to know Cynthia.

Each zone combines a visual palette, environmental behavior, treasure table, wildlife population, ambient language, and potential social scenes. Generation is seedable for tests but effectively unbounded in play.

Only a small window of zones remains actively simulated: the current zone, the next zone, and a recently departed zone. Older zones collapse into durable history records containing significant finds, incidents, ownership changes, and NPC memories. This keeps phone performance stable without erasing consequence.

### Navigation cues

The world teaches direction diegetically:

- schools of fish and rising bubbles drift toward discoveries;
- squid flee from conflict or gather around spectacle;
- light shafts, fabric, jewelry glints, and currents suggest new areas;
- sound cues intensify around treasure, hazards, and social scenes;
- wildlife may react to the player's Siren Call and reveal otherwise subtle opportunities.

The camera should glide rather than snap. Movement uses acceleration, inertia, deceleration, and slight banking so the mermaid feels aquatic without becoming difficult to control.

## The Treasure Current

The Treasure Current is the immediate-gratification toy beneath the free-swimming fantasy. Coins, jewelry, human junk, hazards, and occasional socially dangerous objects drift down from the unexplored water above while the player swims upward through them.

The player's mermaid functions as the cursor. The player reads silhouettes, chooses a path, and decides whether to collect, avoid, compete, or let another mermaid take the risk. Objects remain physically and semantically distinct enough to support split-second decisions.

### Combinations

Collecting related objects consecutively creates an escalating combination:

- three gold objects may become **GILDED ×3**;
- five pieces of jewelry may become **OVERACCESSORIZED ×5**;
- seven pearls may become **STRING OF LIES ×7**.

Collecting an unrelated object ends the current combination but removes no accumulated points. The next collection immediately begins another possibility. Combinations reward attention without demanding perfection.

Treasure Rushes temporarily increase density and spectacle. When a rush settles, the game presents a brief celebratory accounting such as treasure acquired, mermaids offended, disputes created, and Siren Points awarded. Play continues immediately.

### Rival collection

NPC mermaids perceive and pursue Treasure Current objects. They may race the player, block a route, tail-check, collect first, steal from a purse, or flee while visibly wearing the disputed object. The player may use the same social-physical actions against them.

A missed object does not simply cease to exist when a recurring mermaid collects it. It enters her persistent inventory and may later be worn, traded, lost, stolen, or recovered. Common undecorated objects may retire with a zone, but named or disputed possessions remain in durable history.

Treasure distribution should preserve an approximately **80 / 15 / 5** rhythm:

- 80% immediately readable ambient finds;
- 15% concealed or environmentally signaled treasure;
- 5% legendary or socially consequential treasure connected to rumors, rivals, or multiple zones.

## Controls and contextual action

Keyboard controls are intentionally small:

- Arrow keys or WASD swim.
- Space performs the clearly indicated contextual action.
- Existing E, Z, and Enter bindings remain undisclosed accessibility alternatives.

Mobile retains drag-to-steer and a large contextual action button.

The nearest valid target visibly activates before interaction:

- collectibles brighten, rise slightly, and receive a shimmering halo;
- their generated name appears with **SPACE · CLAIM**;
- mermaids receive a distinct social outline and **SPACE · APPROACH**;
- when no target is in range, the prompt becomes **SPACE · CALL** and releases the Siren Call;
- only one target is active at a time;
- reduced-motion mode replaces movement with a strong static outline;
- open sheets, dialogs, and editable controls suppress world actions.

Space never repeats while held.

## Siren Call

When no valid target is in range, Space or the mobile contextual button releases a Siren Call as a low-pressure discovery action. It sends a visible and audible pulse through the nearby ocean.

The call may:

- reveal the glint or silhouette of nearby objects;
- wake or attract wildlife;
- cause a hidden mermaid to respond;
- interrupt an NPC conversation;
- attract unwanted attention when social heat is already high.

The Siren Call has no consumable resource or cooldown that creates anxiety. A short animation delay may prevent accidental spam, but the game never withholds it as punishment.

## Treasure and semantic objects

Treasure gives swimming purpose without becoming a quest. Object silhouettes must communicate category before text appears. Crowns, bags, earrings, shoes, bottles, mirrors, human junk, weapons, and unidentified glamour should not share one generic collectible shape.

Treasure falls into three overlapping types:

1. **Beautiful:** desirable on sight and useful for self-authorship.
2. **Strange:** human debris, impossible artifacts, and objects whose appeal is difficult to defend.
3. **Socially dangerous:** objects with owners, competing claims, secrets, or remembered incidents.

Every object retains provenance: where it appeared, who found it, who owned it, how it changed hands, and which incidents involved it. Ownership is social evidence rather than a legal truth.

Acquisition receives theatrical feedback. The object enlarges, the world briefly reacts, sound and haptics celebrate it, and absurd Siren Points roll into the permanent total.

## Hazards without failure

Environmental creatures and conditions add surprise but cannot kill the player or end a run.

Examples:

- electric eels temporarily exaggerate the player's hair;
- jellyfish attach to purses or relocate a carried object;
- squid ink may ruin a look or accidentally improve it;
- currents deposit the player in an unexpected social scene;
- barracudas become attached to specific jewelry;
- an avoidable danger may award enormous points for poor judgment.

Every negative effect has a funny, legible consequence and a path to recovery. Lost or displaced objects remain in the world's provenance system and may be recovered, traded, or found in another mermaid's possession.

## Ocean swells

Occasional swells give the ocean agency and rearrange the full playfield. They occur irregularly enough to remain events rather than constant interruption.

A swell is telegraphed through fish turning together, bubbles moving sideways, trembling objects, changing light, a low musical rumble, and language such as **THE OCEAN IS ABOUT TO BECOME INVOLVED**. The swell then applies a temporary current to the player, NPCs, loose treasure, and hazards.

Swells may:

- redirect or concentrate falling treasure;
- push mermaids into one another;
- cause carried objects to become loose and stealable;
- turn jellyfish or eels into moving complications;
- reveal a chest, open a wreck, or begin a coin rain;
- create incidents when mermaids assign blame for what the water did.

The player may fight the current, ride it, shelter behind terrain, or exploit it to reach treasure first. Swells cause no damage and no reset. They create displacement, recovery, opportunism, and absurd point awards.

## Autonomous mermaid drama

NPCs must exist in relation to one another, not only in relation to the player.

Each recurring mermaid maintains:

- affinity and rivalry toward other named mermaids;
- attitude toward the player;
- remembered incidents and public humiliations;
- possessions and disputed claims;
- alliances, grudges, rumors, and current social intent;
- confidence, volatility, acquisitiveness, and appetite for spectacle.

The social simulation periodically creates scenes independent of the player. Examples include arguments over ownership, performative reconciliations, exclusionary parties, shifting alliances, gossip circles, staged apologies, and conflicts in which a third mermaid is clearly orchestrating events while denying involvement.

The player may intervene, lie, expose a secret, choose a side, defend someone, steal the disputed object, start a fight, or swim away. Walking away remains a valid action, but the incident can continue and produce later consequences.

### Social Heat and pursuit

Visible behavior creates Social Heat with specific mermaids and their allies. Heat is relational, not a universal wanted meter.

A mermaid may later:

- enter a new zone to confront the player;
- arrive with allies;
- try to reclaim an object;
- spread a rumor before the next encounter;
- feign reconciliation and attack the player's wig;
- become an ally because she respects the audacity.

Pursuit should produce recognition—“Oh, this bitch again”—rather than generic enemy pressure. Encounters remain nonlethal and resolve through shade, performance, snatching, hair-pulling, tail-slapping, splashing, alliances, or strategic departure.

## Siren Points and progression

Siren Points are one uncapped lifetime total. They are never spent, lost, required, monetized, or compared on a leaderboard. The relationship between action and reward is intentionally indefensible. Frequent awards, rolling numbers, short labels, sound, particles, and optional haptics make nearly every few seconds of active play feel acknowledged.

Example awards:

- ordinary coin: +4,006;
- suspiciously public theft: +111,111;
- escaped retaliation: +480,000;
- accidental couture through squid ink: +1,204,800.
- stole during a maritime event: +440,000;
- blamed Cynthia for the weather: +1,200,000.

Temporary combinations create labels such as **PUBLIC NUISANCE ×7** or **UNSUPERVISED GLAMOUR ×12**. Ending a combination loses nothing. Siren Level derives from the permanent total and unlocks celebratory titles or visual flourishes, never access to required play.

## Engagement and feedback cadence

Immediate sensory feedback is part of the game mechanic, not deferred polish. The game should acknowledge active play frequently while preserving enough visual quiet for large moments to remain legible.

The target cadence is:

- **Every 1–3 seconds:** micro-delight through bubbles, tail wake, treasure glints, pickup notes, rolling point additions, particles, and nearby NPC reactions.
- **Every 10–20 seconds:** combination payoff through rising musical pitch, longer glitter trails, larger score typography, named multipliers, or rival interference.
- **Every 45–90 seconds:** spectacle through a Treasure Rush, coin rain, opened chest, rare descending object, multi-mermaid race, or another dense event.
- **Every few minutes:** disruption through an ocean swell, zone transition, legendary rumor, returning rival, or social confrontation.

These intervals are adaptive ranges rather than visible timers. The system should avoid extended dead air, but it should also allow brief calm after spectacle.

### Layered feedback

Pickup sound and animation communicate category and value:

- coins use bright metallic notes;
- pearls use soft glass tones;
- jewelry uses crystalline shimmer;
- junk uses tactile comic impact;
- rare treasure receives a full musical flourish;
- theft uses a sharp snatch cue;
- major score thresholds receive deliberately excessive celebration.

Combination pickups ascend musically. Ending a combination resolves the phrase rather than playing a failure sound. Optional haptics distinguish discovery, acquisition, hazard, confrontation, and legendary treasure.

Visual intensity follows value and context. Ordinary treasure glints, valuable treasure gains a halo and trail, and legendary treasure may alter nearby light and water. Major acquisitions may briefly slow the surrounding field and present the object theatrically. Large point awards roll rapidly into the total rather than appearing as one static number.

## Art direction: Glamour Arcade Illustration

The visual direction is **contemporary glamour illustration with classic arcade energy**. It combines smooth adult editorial characters and luxurious painted ocean environments with the motion, clarity, exaggeration, and theatrical response associated with classic Sega-era arcade play. It borrows arcade energy rather than literal pixel rendering.

### Visual system

- **Mermaids:** adult high-fashion silhouettes, fluid hair, expressive faces, couture-inspired styling, readable tails, exaggerated reaction poses, and meaningful visual diversity.
- **Treasure:** crisp iconographic silhouettes that remain categorically readable while moving. Crowns, bags, earrings, shoes, coins, bottles, junk, jellyfish, and eels cannot collapse into one generic shape.
- **Ocean:** luminous gradients, caustic light, suspended particles, bubbles, depth haze, and layered parallax.
- **Effects:** hard-edged arcade sparkles, halos, trails, shock waves, point bursts, and oversized typography against the softer illustrated environment.
- **Social performance:** side-eye, gasps, pointing, hair flips, laughter, offense, hair displacement, and visible possession disputes.
- **Zones:** distinct palettes and environmental identities expressed through one coherent illustration system.

Ordinary play should remain clean and breathable. Treasure Rushes, legendary acquisitions, and major social incidents may escalate toward dense, extravagant spectacle. The visual range runs from **pretty** to **absurd**, with rare moments in which the entire ocean appears to acknowledge one handbag.

The style must avoid childlike cute-mermaid imagery, generic glossy mobile-game 3D, photorealism, fantasy pinup conventions, pixel-art limitation, grim violence, and constant casino-like noise. The result should feel adult, fashionable, bitchy, luxurious, and ridiculous.

## Social storytelling and the Cabinet of Allegations

The grotto preserves the accumulated story without becoming administrative work.

The Cabinet of Allegations shows:

- collected, created, stolen, lost, and recovered objects;
- each object's provenance;
- recurring mermaids and their current relationships;
- memorable incidents, rumors, and unresolved claims;
- the player's lifetime Siren Points, titles, and most indefensible combinations.

The cabinet is browsable but never demands completion. Its purpose is to let nonsense acquire history.

## Sharing

The Siren Receipt remains the primary social artifact. It should include the current look, title, lifetime Siren Points, a featured possession, the most recent incident, and an optional allegation such as “Cynthia disputes this account.”

Sharing exposes only the generated receipt and public game URL. It does not expose browser-local history or hidden optimal routes because neither exists.

## Architecture

The existing static, dependency-free browser application remains the foundation. New behavior should be separated into deterministic modules:

- `world.mjs` generates zones, active entities, wildlife cues, and vertical streaming;
- `current.mjs` generates falling objects, Treasure Rush timing, combinations, rival target selection, and ocean swells;
- `social.mjs` manages relationships, rumors, alliances, autonomous scenes, heat, and pursuit intent;
- `hazards.mjs` resolves nonlethal environmental consequences;
- `game.mjs` remains the authoritative transition layer for collection, encounters, fights, provenance, and home return;
- `render.mjs` adds camera glide, semantic item silhouettes, target activation, wildlife, hazards, and zone transitions;
- a bounded effects layer within `render.mjs` manages particles, trails, acquisition presentation, point bursts, and adaptive visual density without determining game outcomes;
- `app.mjs` coordinates input, animation, contextual actions, audio, persistence, and sheets without owning game rules;
- `state.mjs` migrates existing saves into the expanded schema without losing player appearance, inventory, progression, NPC memories, or settings.

All rule transitions return a new state plus semantic events. Rendering and audio consume events but never determine outcomes. Randomized systems accept an injected random source so tests can reproduce world and social sequences.

### State additions

The persisted state gains versioned records for:

- world seed, vertical distance, active zone, and summarized prior zones;
- active current, Treasure Rush phase, combination category and count, and next swell window;
- wildlife and hazard consequences that remain relevant;
- NPC-to-NPC relationship edges;
- rumors, alliances, social heat, pursuit intent, and active incidents;
- object disputes and expanded provenance;
- lifetime Siren Points, active combination, and titles.

Migration is additive and defensive. Unknown or partially written records normalize to safe defaults. Storage failure remains nonblocking and visible through the existing notice system.

## Performance, accessibility, and audio

- The active simulation uses bounded entity counts and retires offscreen decorative entities.
- Rendering targets smooth phone play and scales visual density before reducing input responsiveness.
- Effects use pooled, bounded particles and degrade ornamental density before reducing target, treasure, hazard, or NPC legibility.
- Keyboard, touch, screen-reader announcements, safe areas, and reduced motion remain first-class.
- Contextual prompts include text and shape rather than color alone.
- Hazard audio avoids startling volume spikes.
- Music evolves by zone and social intensity without stopping between generated areas.
- Pickup pitch, combination escalation, rush scoring, and swell telegraphing remain audible under the music without excessive volume or fatigue.
- Haptics, when available, distinguish discovery, acquisition, danger, and confrontation but remain optional.

## Error handling

- A failed zone generation falls back to a known-safe zone template.
- Invalid social targets cancel cleanly and produce atmosphere rather than blocking play.
- Missing object or NPC references remain recoverable through normalized state and incident summaries.
- Interrupted confrontations resume when valid or dissolve into a remembered unresolved incident.
- The player can always move, return to the grotto, mute audio, reset local data, or leave the page.

## Testing strategy

Automated tests must cover:

- deterministic endless-zone generation and active-window retirement;
- deterministic Treasure Current spawning, combination transitions, Treasure Rush pacing, and swell telegraphing;
- movement acceleration, glide, and world bounds;
- Space-bar contextual action, repeat suppression, and dialog protection;
- nearest-target selection and visible target semantics;
- semantic treasure categories and provenance across loss, theft, recovery, and remixing;
- nonlethal hazard outcomes and recovery paths;
- NPC treasure pursuit, contested collection, theft in both directions, and durable ownership after a missed pickup;
- NPC-to-NPC relationship changes, autonomous incidents, rumor spread, heat, alliance response, and pursuit;
- absurd point awards, combinations, uncapped totals, and title progression;
- save migration from the current public schema;
- reduced-motion, touch target, keyboard, local-reference, audio, and Pages deployment regressions.
- bounded effects density, category-specific feedback events, and cadence ranges without reliance on exact frame timing.

Manual verification at iPhone portrait size and desktop keyboard size must confirm that a player can enter, understand upward movement without an arrow, acquire treasure, encounter autonomous drama, experience a hazard, recognize a pursuing mermaid, create a receipt, reload into persistent history, and leave without an unresolved required task.

## Acceptance criteria

The release succeeds when:

1. The player can continue upward through distinct generated zones without reaching a designed end.
2. Falling treasure creates a readable collect, avoid, combine, or compete decision within seconds of entry.
3. Treasure Rushes produce satisfying bursts of combinations and score without creating failure screens or required rounds.
4. New discoveries are readable through the environment rather than interface directions.
5. Objects look categorically different and clearly activate before Space claims them.
6. Hazards and swells surprise or rearrange play without death, health loss, or run failure.
7. Mermaids compete for treasure, steal in both directions, interact with one another, and generate drama without waiting for the player.
8. Theft, humiliation, alliance, and object disputes create recognizable later consequences.
9. Siren Points become enormous without becoming currency or obligation.
10. Pickups, combinations, rushes, and disruptions produce distinct escalating visual and audio feedback while preserving gameplay readability.
11. Art direction reads as adult editorial glamour with arcade responsiveness rather than children's fantasy, generic 3D, or casino UI.
12. Existing public saves migrate without losing accumulated nonsense.
13. The game remains immediately understandable on phone and keyboard.
14. A five-minute session feels complete even though the world continues forever.

## Explicit non-goals

This release does not add multiplayer, accounts, cloud saves, leaderboards, monetization, daily challenges, quests, combat damage, death, conventional bosses, a finite campaign, a navigational map, or a competitive fashion score.
