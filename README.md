# Cognitive Studio — Share

Public, self-contained games, quizzes, and highly specific nonsense.

## Published collection

- Collection: https://cognitive-studio.github.io/share/
- *Which You're Next Couple Are You?*: https://cognitive-studio.github.io/share/quizzes/youre-next-couple/
- *Can You Survive You're Next?*: https://cognitive-studio.github.io/share/quizzes/youre-next-survival/
- *Siren Shore*: https://cognitive-studio.github.io/share/games/siren-shore/

## Repository structure

Each experience lives in its own directory:

```text
quizzes/
└── quiz-slug/
    ├── index.html
    ├── favicon.svg
    └── assets/
games/
└── game-slug/
    ├── index.html
    ├── favicon.svg
    └── assets/
```

Experience assets use relative URLs so every game and quiz remains portable beneath GitHub Pages. The root `index.html` is the public collection shelf.

## Add an experience

1. Create `quizzes/<quiz-slug>/` or `games/<game-slug>/` with a self-contained `index.html` and local assets.
2. Add a launch card to the root collection shelf.
3. Add or extend behavior tests under `test/`.
4. Run `node --test test/*.test.mjs` and JavaScript syntax checks.
5. Push to `main`; the Pages workflow validates and publishes automatically.

No build system, external assets, analytics, or runtime services are required.

## Siren Shore on a phone

- Drag the pearl control to swim. Release it and the mermaid glides to a predictable stop.
- Tap the contextual button to claim, approach, or call; its label tells you what is currently in reach.
- Treasure Rushes and swells end without failure. Hazards rearrange the scene, never your right to continue.
- Progress persists locally on the device, including your points, possessions, grudges, and receipts.
- Sound requires the opening touch, and haptics depend on device support; both can be disabled under **More**.
