# Share Quiz Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reusable GitHub Pages collection containing the approved *You're Next* couples quiz and a scalable shelf for future quizzes.

**Architecture:** The repository root is a static collection page. Each quiz is isolated beneath `quizzes/<slug>/` with relative assets, while one official GitHub Pages workflow publishes the repository root after validation.

**Tech Stack:** HTML, CSS, browser ES modules, Node 24 built-in test runner, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-17-share-quiz-collection-design.md`

## Global Constraints

- Public URLs must be `/share/` and `/share/quizzes/youre-next-couple/`.
- Preserve all approved quiz copy, scoring, secret result, accessibility, and mobile behavior.
- Use no runtime services, analytics, trackers, or external assets.
- Every future quiz lives beneath `quizzes/<slug>/`.

---

### Task 1: Repository contract and validation

**Files:**
- Create: `README.md`
- Create: `test/site.test.mjs`

**Interfaces:**
- Consumes: the intended repository paths.
- Produces: a documented add-a-quiz contract and executable static-site validation.

- [ ] **Step 1: Write validation tests first**

Create tests with Node `node:test` that assert the shelf and quiz entrypoints exist, the shelf links to `./quizzes/youre-next-couple/`, every relative stylesheet/module reference resolves, and the Pages workflow exists.

- [ ] **Step 2: Run the tests and verify RED**

```bash
node --test test/site.test.mjs
```

Expected: failures naming the missing shelf, quiz, and workflow files.

- [ ] **Step 3: Document the repository contract**

Document the public URLs, directory convention, local validation command, and steps for adding a new self-contained quiz.

### Task 2: Quiz migration and shelf

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `favicon.svg`
- Create: `quizzes/youre-next-couple/index.html`
- Create: `quizzes/youre-next-couple/assets/app.mjs`
- Create: `quizzes/youre-next-couple/assets/quiz.mjs`
- Create: `quizzes/youre-next-couple/assets/styles.css`
- Create: `quizzes/youre-next-couple/favicon.svg`
- Create: `test/quiz.test.mjs`

**Interfaces:**
- Consumes: the approved quiz source and scoring fixtures.
- Produces: a collection shelf and complete direct quiz route.

- [ ] **Step 1: Add the root collection shelf**

Create one editorial card linking directly to `./quizzes/youre-next-couple/` and a compact statement that future quizzes will appear on the shelf.

- [ ] **Step 2: Migrate the approved quiz**

Copy the validated HTML, CSS, ES modules, favicon, and 13 scoring/state tests without changing result behavior or copy.

- [ ] **Step 3: Run all tests and verify GREEN**

```bash
node --test test/*.test.mjs
```

Expected: all scoring, state, path, and asset checks pass.

### Task 3: Pages deployment

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `.nojekyll`

**Interfaces:**
- Consumes: the validated repository root.
- Produces: automatic public GitHub Pages deployments from `main`.

- [ ] **Step 1: Add the official Pages workflow**

Use `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`; grant `contents: read`, `pages: write`, and `id-token: write`.

- [ ] **Step 2: Re-run the full suite**

```bash
node --test test/*.test.mjs
node --check quizzes/youre-next-couple/assets/app.mjs
node --check quizzes/youre-next-couple/assets/quiz.mjs
```

Expected: every command exits 0.

- [ ] **Step 3: Publish and verify**

Commit to `main`, confirm the Pages workflow succeeds, and verify the collection and direct quiz URLs return successfully.
