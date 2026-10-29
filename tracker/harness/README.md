# Tracker harness

Runs the tracker in headless Chromium and checks what it records: against the live DOM,
through the real player, and side by side with any other git ref.

```sh
cd tracker && bun install             # once: tracker deps (the harness builds the tracker)
cd harness && bun install             # once: harness deps (own lockfile, not a workspace member)
bun run install-browser               # once: Chromium for playwright-core
(cd ../../player && bun install)      # once: only for --replay and e2e (real player)

node cli.mjs core --replay            # DOM-core correctness, replayed by the player
node cli.mjs perf --baseline=dev      # this checkout vs dev, same scenarios
node cli.mjs help
```

## Suites

DOM core: the observers are driven directly (no worker, no transport). Every message is
applied to a mirror with the player's tree semantics; every correctness scenario is checked
against the live DOM at snapshot and at the end, `verifyEach` scenarios also after each step.

| suite | what | useful flags |
|---|---|---|
| `core` | correctness scenarios (`c_*`) and seeded fuzz (`fuzz_*`) | `--replay` also replays through the real player, `--verbose` prints the first mismatch |
| `perf` | tracker time per scenario (snapshot + MutationObserver callbacks), message counts | `--reps=3` |
| `memory` | DOM nodes, listeners, heap after churn and GC | `--late` measures again after the 30 s maintainer pass |
| `profile` | top self-time functions for one scenario | `profile p_virtual_list --impl=default` |

Full tracker: `dist/lib/entry.js` in a page with a fake ingest backend; messages are taken
where the page posts them to the worker.

| suite | what |
|---|---|
| `e2e` | correctness scenarios through the real `Tracker`, replayed by the player |
| `bytes` | encoded bytes per scenario and per message type |
| `modules` | inputs, select, checkbox, clicks, element scroll, late fields, same-origin iframe |
| `leaks` | images, inputs and shadow hosts added and removed; memory after GC |
| `features` | module checks in a real browser (WebGL capture, `adoptedStyleSheets`) |

`list` prints the scenarios and the impls each tree can run; `clean` removes baseline
worktrees and build output (`--results` also the JSON results).

Common flags: positional filters match scenario names (`core shadow iframe`),
`--impls=default,next` (DOM-core suites) or `--modes=default,next` (full-tracker suites),
`--no-build` reuses this checkout's tracker dist, `--strict` exits 1 on any failure,
`--timeout=<ms>` per run (DOM-core suites). Suite runs (not `list`/`profile`/`clean`) write
`results/<suite>-<time>.json`.

## Baselines

`--baseline=<ref>` (branch, tag or sha) checks the ref out as a detached worktree under
`.cache/baselines/<sha>`, builds it there and runs the same scenarios in both trees. Columns
read `<ref>:<impl>` and `work:<impl>`; ratios are relative to the first column. Worktrees are
kept per commit until `node cli.mjs clean`.

- The baseline borrows this checkout's installed dependencies (symlinked `node_modules`).
- DOM-core suites import the baseline's tracker sources directly, so they need the same
  internal constructors (`TopObserver`, `Nodes`, `Sanitizer`, `AttributeSender`). An impl whose
  sources the ref doesn't have (e.g. `next` before it existed) is skipped.
- Full-tracker suites only need a ref whose tracker builds with `bun run build:fast`.

## Layout

```
cli.mjs            entry point
lib/               node side: esbuild bundles, server + fake ingest, browser helpers, baselines, tables
suites/            one module per group of suites
src/page/          the scenario page (window.H): scenarios, mirror, expected tree, impls
src/replay/        the real player (mcp_app ReplayEngine over player/src) as window.replay
src/features/      feature checks (window.checks)
```

Browser code imports the tracker as `@tracker/...` (its `src/`); the build points that alias at
this checkout or at the baseline worktree.

## Extending

- **Scenario**: add to `src/page/scenarios.ts`. `kind: 'correct'` scenarios run in `core` and
  `e2e` and are verified against `expectedTree()`; `perf` and `memory` ones are measured.
  `settle` waits after each step, `verifyEach` checks after every step instead of only at the end.
- **DOM-core impl**: a factory in `src/page/impls/` (see `default.ts`), registered in `IMPLS` in
  `lib/build.mjs` with the tracker files it needs.
- **Module check**: a `[name, check]` pair in `MODULE_CHECKS` (`suites/tracker.mjs`); extend the
  scripted input in `modules()` if it needs new interactions.
- **Feature check**: `checks.<name> = async () => ({ ok, details })` in `src/features/index.ts`.

`src/page/expected.ts` is the oracle: it serializes the live DOM the way a correct
tracker and player pair should reproduce it, privacy rules included. It keeps its own copies
of the rules on purpose; change it only when the intended behavior changes.
Full-tracker suites call it with `imgModule: true`: there the img module adds `<img>` and
`<picture> <source>` src/srcset, which the DOM core alone never sends.

The harness is dev tooling: it is not a workspace member and CI skips `tracker/harness/**`.

## Known failures

`default` core: 8 of 16 `c_*` cases and every fuzz seed (sibling order on several moves,
moves into hidden/obscured containers, masked shadow hosts, hidden iframes, appends to lists
of ~4k+ siblings). `next` passes all of them.
