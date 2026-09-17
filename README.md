# Cognitive Studio — Share

Public, self-contained quizzes for movies, television, relationships, and other highly specific cultural investigations.

## Published collection

- Collection: https://cognitive-studio.github.io/share/
- *Which You're Next Couple Are You?*: https://cognitive-studio.github.io/share/quizzes/youre-next-couple/

## Repository structure

Each quiz lives in its own directory:

```text
quizzes/
└── quiz-slug/
    ├── index.html
    ├── favicon.svg
    └── assets/
```

Quiz assets use relative URLs so every experience remains portable beneath GitHub Pages. The root `index.html` is the public collection shelf.

## Add a quiz

1. Create `quizzes/<quiz-slug>/` with a self-contained `index.html` and local assets.
2. Add a launch card to the root collection shelf.
3. Add or extend behavior tests under `test/`.
4. Run `node --test test/*.test.mjs` and JavaScript syntax checks.
5. Push to `main`; the Pages workflow validates and publishes automatically.

No build system, external assets, analytics, or runtime services are required.
