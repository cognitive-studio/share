# Share Quiz Collection — Design

## Purpose

Turn `cognitive-studio/share` into the public, durable home for Andrew and Kendra's shareable film and television quizzes, beginning with **Which You're Next Couple Are You?**

## Information architecture

- `/` is the collection shelf and introduces the available quizzes.
- `/quizzes/youre-next-couple/` contains the complete existing quiz experience.
- Every future quiz receives its own self-contained directory beneath `/quizzes/`.
- Relative asset references keep every quiz portable within GitHub Pages.

## Experience

The shelf uses the same exuberant editorial language as the first quiz without impersonating BuzzFeed branding. It presents one launch card now and scales naturally as more quizzes are added. The direct quiz route preserves the approved content, scoring, hidden Erin + Zee outcome, accessibility, mobile behavior, and result sharing.

## Publishing

A GitHub Actions workflow publishes the repository root to GitHub Pages on every push to `main`. The workflow uses the official Pages configure, artifact upload, and deployment actions. The expected public URLs are:

- Collection: `https://cognitive-studio.github.io/share/`
- Quiz: `https://cognitive-studio.github.io/share/quizzes/youre-next-couple/`

## Repository contract

Each quiz directory owns its HTML, assets, scoring, tests, and optional favicon. The root README documents the add-a-quiz pattern. Tests verify scoring and state transitions; a repository validator checks that the shelf link resolves, required Pages files exist, local asset references are valid, and the workflow publishes the correct source.

## Constraints

- Public repository and public GitHub Pages output.
- No runtime services, accounts, analytics, trackers, or external assets.
- No change to the approved quiz result language or scoring behavior.
- Mobile-first, keyboard accessible, and reduced-motion aware.
