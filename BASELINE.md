# Rosalie verified baseline

Baseline date: 2026-08-26
Repository checkpoint: `6037ddb` on `main`, plus the currently verified uncommitted feature work

## Protected surface

- The password gate, signed visitor identity, and safe local return paths.
- The ten-day countdown and its non-negative boundary states.
- Every registered game’s rules, mobile controls, progress persistence, high-DPI rendering, and bounded artwork sizing.
- Shared treehole messages and replies, the shared calendar, validation, and durable Vercel Blob storage.
- The interview agent’s `gpt-5.6` primary model, sub-10-second fallback to `gpt-5.4-mini`, truthful SSE progress events, streamed answer text, saved records, and optional press-and-hold speech input.
- The five-item mobile dock, light/dark presentation, phone-safe layout, and production-compatible Vercel build.
- The canonical public host remains `https://rosalie.toni.asia`.

## Baseline gate

Run from the project root:

```sh
pnpm qa:baseline
```

The command exits non-zero if any of these fail:

1. The complete Node behavior suite.
2. ESLint.
3. The Vercel production build with `VERCEL=1`.
4. Mobile transfer budgets after the build:
   - home route JavaScript: at most 24 KiB raw and 8 KiB gzip;
   - interview route JavaScript: at most 32 KiB raw and 10 KiB gzip;
   - home visual assets: at most 180 KiB combined.

## Current evidence

- `pnpm qa:baseline` passed on 2026-08-26.
- 122 behavior tests passed; ESLint and the Vercel production build passed.
- Built home route JavaScript: 16,053 B raw / 5,600 B gzip.
- Built interview route JavaScript: 19,230 B raw / 6,649 B gzip.
- Home visual assets: 167,234 B combined.
- The configured provider’s `/models` endpoint returned HTTP 200 and listed `gpt-5.6`.
- A real completion request using `gpt-5.6` returned HTTP 200 with content in 2.7 seconds; the provider resolved the alias to `gpt-5.6-sol`.
- A real completion request using the `gpt-5.4-mini` fallback returned HTTP 200 with content. Primary failover begins after 8.5 seconds without a first token.
- The interview API key and base URL remain server-only; no `NEXT_PUBLIC_` credential is used.
- Production deployment `dpl_4xKkojy2zDmDEjQhQHdBa4Sgkcik` is `READY` and aliased to `https://rosalie.toni.asia`.
- A production interview smoke test completed in 4.45 seconds with 52 SSE events and 42 text patches, using `gpt-5.6` without fallback.
- Mobile QA at 390×844 found no horizontal overflow, all five dock items present, and no visible interactive target below 44×44 CSS pixels.

Automated checks protect behavior, build compatibility, and transfer size. Visual changes must also repeat the affected phone viewport and interaction path; this is intentionally not a brittle pixel snapshot.

## Rule for future changes

Run `pnpm qa:baseline` before changing a verified surface and again after the change. Do not deploy while the gate is red. For UI work, also repeat the affected phone interaction path before deployment.

Suggested checkpoint tag after this work is committed:

```sh
git tag baseline-2026-08-26-gpt56
```
