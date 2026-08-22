# Rosalie verified baseline

Baseline date: 2026-08-22  
Behavior checkpoint: `b2d9899` (`Turn shared schedule into a calendar`)

## Protected surface

- The password gate, signed visitor identity, and safe local return paths.
- The ten-day countdown and its non-negative boundary states.
- All seven games' core rules, level progress persistence, high-DPI canvas sizing, and touch coordinate mapping.
- The shared treehole and schedule validation/storage contracts.
- The shared schedule's Monday-first, six-week month grid, Beijing date assignment, cross-year navigation, and selected-day time prefill.
- A production-compatible Next.js build for Vercel. The canonical public host remains `https://rosalie.toni.asia`.

## Baseline gate

Run from the project root:

```sh
pnpm qa:baseline
```

The command exits non-zero if any of these fail:

1. The complete Node behavior suite.
2. ESLint.
3. The Vercel production build with `VERCEL=1`.

## Current evidence

- 78 behavior tests passed.
- ESLint passed without warnings.
- The Vercel production build passed.
- Manual responsive QA passed at 390×844 and 1280×800 with no horizontal overflow.
- The schedule form is absent by default; selecting 2026-08-29 and opening the composer prefills `2026-08-29T09:00`.
- Production deployment `dpl_D4hAXTcaZFt1Sh4DpZwQxcyTVNjv` was `Ready` and aliased to the canonical host.

The automated gate protects behavior and build compatibility. Visual changes must also repeat the relevant mobile and desktop browser path; this file is not a pixel snapshot.

## Rule for future changes

Run `pnpm qa:baseline` once on a clean checkout before changing code and again after the change. Do not merge or deploy while the gate is red. For UI work, also repeat the affected responsive path before deployment.

Suggested local checkpoint tag after this package is committed:

```sh
git tag baseline-2026-08-22-tested
```
