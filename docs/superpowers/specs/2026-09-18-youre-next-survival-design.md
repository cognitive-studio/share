# You’re Next Survival Game Design

## Purpose

Build a five-minute, mobile-first choose-your-own-adventure that places one player inside the atmosphere of *You’re Next*. The experience must let the player earn competence through observation, preparation, deception, timing, and adaptation. It must never award an Erin comparison merely for choosing violent answers.

## Experience contract

- The player is the sole protagonist. No Andrew character appears.
- The game uses a secluded family estate, a disastrous dinner, animal-masked intruders, an inside conspiracy, and Erin as a benchmark without reproducing film dialogue or artwork.
- Seven short decisions form one complete run.
- Earlier observations and preparations unlock later choices.
- The player may defend, escape, collaborate, infiltrate, or seize control.
- Morality is never displayed or scored as good versus evil.
- Consequence copy appears after each choice so the narrative feels reactive.
- The top rank is possible on the first run but requires a coherent sequence rather than obvious aggression.
- A second run uses a changed breach variant and preserves no tactical advantages beyond player knowledge.

## State model

The pure engine owns all game rules. Its state contains the current scene, seven hidden attributes, flags, inventory, history, casualties, variant, and final outcome. Choice availability is derived entirely from state. Invalid or unavailable choices are rejected.

Hidden attributes are awareness, preparation, nerve, deception, adaptation, ruthlessness, and control. The interface may describe earned evidence at the end but never exposes numeric values during play.

## Narrative flow

1. Arrival: choose what to study before dinner.
2. Dinner: choose position and social posture as tension rises.
3. Impact: react when the first projectile enters the room.
4. Lockdown: spend the limited preparation window.
5. Offer: answer an intruder who suggests the attack has an inside edge.
6. Countermove: deploy a plan using only earned information and resources.
7. Reckoning: respond when the conspiracy and remaining threat converge.

The second-run variant changes the breach location and makes one previously safe assumption unreliable.

## Outcomes

- Bad Bitch, Baptised by Fire: highest earned rank; exceptional awareness, preparation, adaptation, and control.
- The Architect: controls the environment and dictates movement.
- The Counterfeit Victim: survives through deception and false cooperation.
- The Last Problem: becomes more destabilizing than either faction expected.
- The Exit Wound: escapes cleanly and leaves the conspiracy collapsing.
- The House Guest: survives but misunderstands part of the plan.
- The Volunteer: cooperates without retaining leverage.
- Everyone Dies but Kendra: secret perfect-chaos outcome requiring a specific high-casualty usurper route.

Every outcome includes a verdict, evidence from actual decisions, and replay language. The top result may say Erin would trust the player with the other side of the house; it must not say the player “is Erin.”

## Presentation

The visual language is cinematic rather than the bright couples-quiz design: black, bone, bruised red, oxidized amber, scratched borders, animal-mask silhouettes, restrained motion, and strong typographic hierarchy. No external imagery, fonts, analytics, services, or copyrighted stills are used.

The application remains keyboard accessible, announces scene changes, honors reduced motion, and keeps every interactive target usable on a phone. Sharing copies only the earned title and public URL; it never exposes the optimal route.

## Repository integration

The experience lives at `quizzes/youre-next-survival/`. The collection shelf gains a second card. Node tests cover state transitions, prerequisites, top-rank gating, alternate routes, replay variants, and the secret ending. Site tests verify local assets and Pages validation includes both game modules.

