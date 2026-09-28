# Tracker core experiment — 2026-09-28

Question: can the tracker do the same job with a conceptually different design that is more stable,
faster or smaller? Is the node Maintainer needed at all?

Deliverable: `src/next/NextObserver.ts` — a working replacement for `Observer + TopObserver +
IFrameObserver + ShadowRootObserver + Nodes + Maintainer`. It emits the **same wire protocol**
(the unmodified player replays it) and was compared against the current core in headless Chromium.
Module-level alternatives (non-DOM) come from three parallel code reviews and are summarised at the end.

## TL;DR

| | current core | next core |
|---|---|---|
| targeted correctness cases (17) | **8 fail** | 17 pass |
| random-mutation fuzz, 10 seeds × 300–400 batches, verified after every batch | **10/10 seeds fail** | 10/10 pass |
| end state replayed through the real player (`ReplayEngine`) | diverges wherever the mirror did | identical to the live DOM |
| Maintainer / id→Node map / per-node unregister walk | yes / yes / yes | **none** |
| MutationObservers | 1 per document + 1 per iframe + 1 per shadow root | **1 total** |
| size, min / gz (shared deps external) | 22.4 KB / 7.2 KB | 11.8 KB / 4.4 KB¹ |

¹ next lacks `<use>` sprite inlining, remote-CSS inlining hooks and the color-scheme message (~2–3 KB of the gap).

Two severe bugs with small fixes fell out of the benchmark and apply to the current tracker as is:

1. **DOM recording dies permanently** once any parent has ~3–4k tracked children and something is appended
   to it. The sibling-index computation recurses once per previous sibling (`observer.ts:641-650`) and
   overflows the stack; `commitNodes()` throws before `clear()`, so `recents` keeps the poisoned entry and
   **every later batch throws too**. `app.safe` swallows it — sessions just stop recording DOM.
   Repro: `H.wideProbe('current', 4000)` → created 0, later unrelated mutations 0.
2. **`StringDictionary.getKey` costs 4.2 µs per call** (introduced 5 days ago in 36329876c, unreleased). The
   LRU "touch" (`Map.delete` + `set` on every hit) forces V8 OrderedHashMap compactions. It was ~49% of all
   tracker CPU in the virtual-list run. A two-generation dictionary (`src/next/GenDictionary.ts`, same keys,
   still bounded) costs 19 ns — 220× faster.

## What is conceptually different

**1. Liveness by structure instead of bookkeeping (answers "do we need the Maintainer?" — no).**
Each tracked node owns a tiny record `{id, p}` where `p` is its *player-side* parent record. A node is live
iff its record chain reaches the root without hitting a removed record or an old epoch.

- Removing a branch, an iframe, or the document inside an iframe = flag **one** record. Descendants are dead
  by construction. The GC collects the DOM — no `Map<id, Node>` holds it, so there is nothing to scan.
- A child pulled out of a removed branch and re-inserted later is detected as stale by the chain walk
  (path-compressed, memoised per batch) and recreated with a fresh id.
- Root swap / restart = `epoch++`, invalidating every record in O(1) (current: walks and deletes all).
- Iframe document replaced = kill the old document record; new document gets `CreateIFrameDocument`.
- Per-batch state lives on the records via batch stamps, not in id-indexed sparse arrays.

The things the current core needs the id map for have cheaper answers: per-node listeners → one capture
listener per root (see interaction modules below — also more robust against `stopPropagation`), `getNode(id)`
for assist → O(N) scan (rare call), canvas `scanTree` → `querySelectorAll('canvas')` per root.

**2. One MutationObserver for everything.** Top document, same-origin iframe documents and shadow roots are
all `observe()`d by the same instance, so records arrive in global order in one callback and commit once.
(This is the TODO at `observer.ts:758`.) No observer objects to leak.

**3. Index without recursion, O(1) for appends/prepends.** Walk previous and next siblings alternately,
stop at the first end or at a memoised sibling (valid while the parent's player-side children haven't
changed). Right end uses the tracked player-side child count.

**4. Move ordering that is correct for arbitrary reorders, protocol unchanged.** Numeric indexes break when a
parent still holds (player-side) children that moved in this batch but aren't re-placed yet. Such stale
children are first parked at the end of their old parent when other placements target it. Nodes whose new
container is created later in the batch get their pending ancestors placed first (top-down, iterative).

**5. Privacy level on the record, inherited through shadow roots; level change on move rebuilds the subtree.**
Hidden hosts don't get their shadow root or iframe recorded.

**6. Record storage.** Symbol-keyed slot on the node beats `WeakMap`: WeakMap kept +1 MB heap after churn
(ephemeron table capacity never shrinks) and was 5–10% slower. The symbol is invisible to JSON/`for…in`.

## Results

Headless Chromium 1228, M-series Mac, median of 3. "MO" = time inside MutationObserver callbacks.
Current core's iframe handling runs in a 250 ms `setTimeout`, **not counted** here (favours current).
`+dict` = with `GenDictionary`.

| scenario | current | current+dict | next+dict | next vs current |
|---|---|---|---|---|
| snapshot, 50k nodes | 109 ms | 58 ms | **43 ms** | 2.5× |
| 300× append 1 row to 2k-row list | 389 ms | 385 ms | **12 ms** | 31× |
| 300× append 1 row to 10k-row list | 357 ms, **records nothing** (overflow) | same | **12 ms** | — |
| 10× remove an 8.5k-node subtree | 27.7 ms | 27.6 ms | **0.4 ms** | 70× |
| virtual list, 200× replace 100 rows | 1759 ms | 396 ms | **247 ms** | 7.1× |
| keyed reorder, 100× move 5 of 1000 rows | 58 ms | 58 ms | **12 ms** | 5× |
| 5× add+remove 20k subtree | 207 ms | 135 ms | **74 ms** | 2.8× |
| class storm, 2000 els × 50 | 242 ms | 84 ms | **36 ms** | 6.7× |
| text storm, 2000 nodes × 50 | 141 ms | 141 ms | **39 ms** | 3.6× |
| 3000 web components with shadow roots | 119 ms | 121 ms | **10 ms** | 12× (current is O(n²): `handleShadowRoot` loops all observers) |

Wire bytes are equal (raw within 0.1%). gz differs ±2% by message order (next sends removals first).

Memory after churn, forced GC (`Memory.getDOMCounters`). Baseline without tracker: 1 document, 8 nodes, ~1.0 MB.

| scenario | current | current +36 s (after Maintainer pass) | next (symbol store) |
|---|---|---|---|
| 20× add+remove iframe (~1k nodes) | 21 docs, 27k nodes, 10.1 MB | **9 docs, 10.9k nodes, 5.5 MB** | 1 doc, 9 nodes, 1.3 MB |
| 10× add+remove 10k subtree | 9 nodes, 1.4 MB | same | 9 nodes, 1.4 MB |
| 10× add+remove 300 shadow components | 18k nodes, 2.9 MB | **10.8k nodes, 2.7 MB** | 9 nodes, 1.3 MB |

Current retains detached iframe documents even after the Maintainer pass. Likely cause (not isolated):
`iframeObserversArr` keeps every IFrameObserver and its MutationObserver, plus the iframe-offset listeners left
on the parent document. Shadow roots stay until the next `attachShadow` call (`shadowRootObservers` Map).

## Bugs in the current DOM core (all reproduced by the harness)

| # | bug | where | effect |
|---|---|---|---|
| 1 | recursive sibling index overflows at ~3–4k siblings; `recents` never cleared after the throw | observer.ts:641-650, 746-755 | DOM recording dead for the rest of the session |
| 2 | several moves under one parent in one batch (reverse, sort) | `_commitNode` index | wrong order in replay (`c_reverse`) |
| 3 | insert into P while an earlier sibling of P moves elsewhere | same | wrong order (`c_stale_sibling`) |
| 4 | move existing nodes into a new container | same | container lands at wrong index (`c_move_new_container`) |
| 5 | move into a hidden container | observer.ts:636-638 returns without `RemoveNode` | ghost node stays visible |
| 6 | move into an obscured container | escalate-only level, no re-emit | **text stays unmasked** |
| 7 | shadow root under obscured host / hidden host | observer.ts:609 (roots skip `handleNode`), top_observer.ts:210 | **shadow text sent in plain / hidden content recorded** |
| 8 | iframe inside hidden container | node callbacks run even when commit failed (observer.ts:750) | **iframe content on the wire** |
| 9 | iframe and shadow-root churn leaks | top_observer.ts:160-223 | see memory table |
| 10 | dictionary LRU touch | attributeSender.ts:28-33 | 4.2 µs per attribute string |

Fuzzing also showed current failing within the first 5–85 random batches on every seed.

## Gaps in the prototype (needed before it could replace the current core)

`<use>` sprite inlining, `inlineRemoteCss`, color-scheme signal, text throttling, crossdomain id packing
(only a `firstId` option), `resanitizeSubtree` API, delegated listeners for input/focus/scroll/img
(modules still expect `attachNodeListener`), `UnbindNodes` percent is approximated per removed root with a
native `getElementsByTagName('*').length`. Closed shadow roots are captured via the `attachShadow` hook but
not covered by the harness.

## Other modules — alternatives judged (from three read-only reviews)

Bundle context: whole tracker ≈ 201 KB min / 59 KB gz after terser (published dist is **unminified**, 471 KB).
Measured wire mix on a real 35-min session: CSS text 56%, attributes 34% (dict off), node creation 4%, mouse 0.03%.

| area | current | alternative | verdict |
|---|---|---|---|
| per-node listeners (input, focus, img, slot) | listener + closures per node (~800 B per input) | one capture listener per root; `composedPath()[0]` for shadow; per-root for non-composed `change`/`focus`/`load` | do it with the core change; also more robust vs `stopPropagation` |
| input values | 120 ms poll | setter hooks | keep polling (React caches setters, `form.reset()`) |
| scroll | already per-root capture | — | keep |
| selection | full `toString()` per event, unsanitized, player ignores it | coalesce on ticker, send `''`; later id+offset ranges | clear win (privacy) |
| img | 2 listeners + 1 MutationObserver per image; src path skips sanitizer | route src/srcset via core observer, per-root load/error | clear win (privacy) |
| sanitizer | `closest()` per node in privateMode; levels never pruned | inherit "unmasked" bit; level on record | worth it (−7.6 ms/30k nodes) |
| ticker | 30 ms interval forever; 98.6% of wakeups idle | schedule flush on first send, 30 s keepalive timer | worth prototyping (33 → ~4 wakeups/s idle) |
| main-thread encoding + transfer | tuples structured-cloned to worker | encode on main thread | **reject**: +40% main-thread CPU; SAB needs COOP/COEP |
| dictionary keys | time-based, 8-byte varints | page-namespaced dense keys | −4.4% gz, no protocol change |
| cold start | two tuple buffers, chunked flush 8–17 s, `stop()` every 30 s | stream to worker, encoded ring buffer there | worth prototyping (fixes cold-start bugs below) |
| crossdomain | packed ids (5-byte varints), 250 ms polling | MessagePort per child, local ids, player applies scope | worth prototyping (needs player) |
| detectors in worker | — | move to backend | reject (moved in deliberately, needs MessageIDs) |
| network | clone + parse + stringify every body, then drop it (default `capturePayload: false`) | pass `capturePayload`/`failuresOnly` into the proxy; proxy per realm; return real `Response` | clear win |
| network timing | fetch/XHR proxies | PerformanceObserver-only lite mode | opt-in only (−21 KB min) |
| exceptions | no dedupe (rAF loop = 60 msg/s) | dedupe by name+message+frame, count in metadata | clear win |
| console | unbounded synchronous `printf` | bounded preview (depth 2, 4 KB) | worth it |
| performance.ts | rAF loop never stops | sample 1 s of every 5 s | small win |
| timing / Speed Index | `getComputedStyle` on every element | drop Speed Index, LoAF-based TTI | needs product call |
| CSSOM | patch insertRule; 200 ms poll re-sends rules | keep patching; watch only empty rules via `WeakMap<CSSRule>`; one Replace per sheet | clear win |
| cssInliner | join rules then re-split on braces | iterate `cssRules` directly | clear win (fixes Tailwind v4 `@layer` loss) |
| CSS bytes | full CSS per session | content-addressed CSS (hash, backend cache) | biggest byte win (~50% of wire), needs backend |
| canvas | `toBlob(webp)` per interval, full resolution | `captureStream`+MediaRecorder; skip identical frames now | biggest canvas win; frame-skip is a clear win |

### Module bugs reported by the reviews (not re-verified here unless noted "verified" by the reviewer)

- **Transport/app:** crossdomain MouseMove/MouseClick sent twice (`app/index.ts:888-931`); idle crossdomain child
  posts every 30 ms; `messages.push(...mapped)` RangeError above ~120k; FIFO scheduler chained through rAF stalls in
  hidden tabs → data produced in background lost on tab close; `mouseleave` on body triggers the full unload flush
  (uncompressed, parallel, breaks FIFO); cold-start `stop(false)` every 30 s drops listeners and duration
  conditions and re-snapshots the DOM; worker start/stop race.
- **Network (verified by reviewer):** same-origin iframe requests go through the top realm's proxy (wrong base URL,
  captured twice); `fetch(new URL(...))` not captured; chunked responses never reported, SSE buffered forever;
  proxied `Response` fails brand checks (`cache.put` throws). axiosSpy leaks `Authorization` via `toJSON()`.
- **CSS/canvas (verified by reviewer):** cssInliner glues brace-less at-rules (Tailwind v4 theme lost) and the
  player's fallback inverts the cascade; WebGL canvases record blank frames; Safari `toBlob('image/webp')` is PNG.
  From code: `scanInMemoryCSS` duplicates rules; canvases in shadow DOM/iframes stop after one tick
  (`document.contains`); `styleSheetIDMap` strong Map retains detached iframe documents.
- **Interaction/privacy:** hash URLs trigger `SetPageLocation` ~16/s forever (`viewport.ts:44-51`, verified);
  img `src` changes skip the sanitizer (verified); selection text sent unmasked; password → text toggle leaks
  in Plain mode; CSS-path selectors not unique (`data-v-*`), class-uniqueness cache never invalidated.

## Suggested order

1. Small fixes in the current tracker, no redesign: `GenDictionary`; iterative index + `clear()` in `finally`;
   bugs 5–9 above; privacy bugs from the reviews (img src, selection, iframe/shadow levels).
2. Replace the DOM core with the next design behind a flag, together with per-root delegated listeners —
   that is what removes the Maintainer, the id map and per-node unregister walks.
3. Transport: event-driven ticker, cold start buffered in the worker, dense dictionary keys.
4. Byte wins that need backend/player work: content-addressed CSS, canvas video, crossdomain ports.

## Running it

```sh
./build.sh                                  # tsc + bun bundle (page) + esbuild (real player)
node run.mjs c_ --replay                    # targeted cases, both cores, + real-player end state
node run.mjs fuzz --replay --timeout=200000 # 10 fuzz seeds, verified after every batch
node run.mjs p_ --impls=current,current+gendict,next-symbol,next+gendict --reps=3
node run.mjs m_ --impls=none,current,next-symbol --late   # memory, incl. after the 30 s Maintainer pass
node prof.mjs p_virtual_list next+gendict   # CPU profile, top self-time
```

Layout: `src/next/` prototype, `src/harness/` (mirror = player tree semantics, expected = live-DOM serializer,
scenarios, page runner), `src/replay/` (real `ReplayEngine` + `translate`), `run.mjs` driver.
