# /:project/session/:sessionId — frontend action plan

Source: `frontend/reports/2325-session.html` (prod SaaS audit 2026-09-16, code baseline `2e8097749`).
This plan: frontend-only items, re-verified against **dev HEAD `a018a7045` + the batch-1 changes from `65-sessions-plan.md`** on 2026-09-17.
Companion to `65-sessions-plan.md`; shared findings (gzip, `/filters`, boot set) are cross-referenced, not repeated.

Budget on the measured page: 19 API requests + 11 preflights, 94.5 KB API wire, 1.54–1.63 s doc → last response.
**The critical path is set almost entirely by one backend call**: `/events` at 1,065 ms. Playback itself is ready at ~0.64 s and does not wait for it — what waits is the timeline, the Events sidebar, X-Ray and Page Insights.

Realistic frontend share: **~5 requests and ~37 KB removed, ~50–250 ms off both critical paths, plus two correctness bugs.** The second 1 s is backend.

---

## 0. Report claims that are already stale — do not act on these

The audit ran against production (`v1.27.0-saas`); dev HEAD has moved.

| Report says | Reality at `a018a7045` | Action |
|---|---|---|
| §2.7 "Cloudflare Turnstile loaded on every route (`frontend/index.html:46`)" | **Not in this repo.** No `turnstile` / `challenges.cloudflare` match anywhere under `frontend/`. Either already removed or SaaS-injected. | Drop from the frontend plan; confirm with whoever owns the SaaS shell. |
| §2.4 "recharts (`generateCategoricalChart`, 89 KB) loads eagerly on the replay route" | **recharts is gone from the repo** — zero matches in `app/` and not in `package.json`. The prod bundle predates its removal. | Drop. Re-measure the replay chunk set before reopening. |
| §5.1 "parallelise `/account` ∥ `/projects` (`Router.tsx:91-93`)" | **Already done** — `Router.tsx:92` `projectsStore.prefetchList()`. | Drop. |
| §5.1 "Dead code: `types/watchdog.js`" | **Already deleted** in batch 1. | Drop. |
| §3.10 / §5.1 "`/limits` fired from a hidden header" | `/limits` is **off the boot path entirely** since batch 1 (`userStore.ensureLimits()` is called by the settings buttons). `/notifications/count` still fires — see FE-5. | Partly done. |
| §2.5 "the sessions-list boot set fires here" | Still true, and `/{project}/integrations` is now gone from it (batch 1 FE-3). `POST /sessions/search` now fires **earlier** than the audit shows, because batch 1 FE-1 unblocked it from `/filters`. | Still open — see FE-3. |

Everything else re-checked against the tree and still true.

---

## 1. Correctness — two real bugs

### FE-1 — X-Ray frustrations never render ★ highest value in this plan
**Impact:** every issue returned by `/events` is silently dropped. On the audited session that is all 16. **Effort:** XS. **Risk:** L.

**Evidence (verified).** The Go handler emits `issueType` (`backend/pkg/analytics/events/events.go:389`). `Issue`'s constructor destructures `type`:

```ts
// app/types/session/issue.ts:153
constructor({ type, ...rest }: IIssue & { key: number }) {
  Object.assign(this, { ...rest, type, icon: issues_types_map[type]?.icon, name: issues_types_map[type]?.name });
}
```

Both construction sites hand it the raw payload (`session.ts:390-392` and `session.ts:496-499`), so `type`, `icon` and `name` all come out `undefined`. Every downstream comparison is therefore dead:
- `session.ts:404` `i.type === issueTypes.MOUSE_THRASHING`
- `session.ts:534-536` the `MOUSE_THRASHING || TAP_RAGE || DEAD_CLICK` frustration filter
- `session.ts:551` the `!== DEAD_CLICK` split

The frontend's **own** synthetic incident issue (`session.ts:483-494`) also sets `issueType`, so it is broken by the same mismatch — this is not purely a backend-shape problem.

**Change.** Accept both keys in the `Issue` constructor (`const type = raw.type ?? raw.issueType`) and keep writing `type` on the instance. Fixing it at the model boundary covers both construction sites and the synthetic incident in one place.

**Validate.** Open a session with known mouse-thrashing / dead-click issues → X-Ray "Frustrations" populates; `mixedEventsWithIssues` contains issues; timeline markers appear.

**Note:** there is a *second*, backend-side half to this — see BE-2 (`issueTypes` on `/replay` arrives as a Postgres array literal, not an array). They are independent; this one ships alone.

---

### FE-2 — `search/ids` page 2 is fetched on every replay open
**Impact:** one wasted `POST /v2/{project}/sessions/search/ids` per session open. **Effort:** XS. **Risk:** L.

**Evidence (verified).** `QueueControls.tsx:36-51`, `useEffect(..., [])` — runs once on mount, before the session list has been applied:

```ts
const index = sessionIds.indexOf(sessionId);       // [] → -1
if (currentPage !== totalPages && index === sessionIds.length - 1) {  // -1 === -1 → true
  sessionStore.fetchAutoplayList(currentPage + 1)
}
```

With `total = 0`, `totalPages = 0` and `currentPage = 1`, both conditions pass unconditionally and page 2 is fetched for a list that does not exist yet.

**Change.** Bail out when the list is empty (`if (!sessionIds.length) return;`) and re-run the effect when `sessionIds`/`total` actually arrive rather than only on mount.

**Validate.** Open a session directly by URL → no `search/ids` call. Open one from the list, scroll to the last item, hit next → page 2 is fetched exactly once.

---

## 2. Requests that should not happen on this route

### FE-3 — The sessions-list boot set fires on a replay page
**Impact:** ~4 requests and ~37 KB that render nothing here. **Effort:** S. **Risk:** M.

**Evidence (verified).** `/v2/filters` (26 KB), `/sessions/search/saved` (5.4 KB), `POST /sessions/search` (5.5 KB) all fire on the replay route from route-agnostic effects: `PrivateRoutes.tsx` (filters, and the URL-parse effect that triggers the search) and `Router.tsx:179-191` (saved searches).

Of that, the replay page reads **only a list of session ids**, for prev/next (`sessionStore.ts:498-504` → `QueueControls.tsx:23-24`). `/filters` is needed only if the click-map tab opens.

Batch 1 made this slightly worse in one respect: `POST /sessions/search` no longer waits for `/filters`, so on this route the wasted search now fires sooner.

**Change.** Scope the three effects to list routes. The cleanest seam is a route check in `PrivateRoutes` (the effects already live there) plus the `siteId` effect in `Router.tsx:179-191`. Where prev/next genuinely needs ids, one `search/ids` call is enough — and per FE-2 it should be lazy anyway.

**Watch for.** `searchStore.urlParsed` is a one-shot latch. If the search effect is skipped on the replay route, navigating replay → list must still parse the URL and fetch. Gate on the route, not on a flag that persists across navigation.

**Validate.** Open a session by URL cold → `/filters`, `/search/saved` and `POST /sessions/search` are absent. Navigate to the list → all three fire normally. Prev/next still works from both entry points.

---

### FE-4 — `/integrations/issues` and `/metadata` refetch on every session mount
**Impact:** 2 requests per replay open, both with cached/idempotent answers. **Effort:** S. **Risk:** L.

**Evidence (verified).**
- `WebPlayer.tsx:109` calls `integrationsStore.issues.fetchIntegrations()` unconditionally on every `session.sessionId` change. The store already has an `issuesFetched` flag (`integrationsStore.ts:97,125`) that nothing consults. Used only for the "Create Issue" button's provider (`Subheader.tsx:51-73`).
- `PlayerBlockHeader.tsx:52` and `MobilePlayerHeader.tsx:45` do `if (metaList.length === 0) customFieldStore.fetchList()` — an empty-list check, not a fetched check, so a project with **zero** metadata keys refetches on every single mount forever.

**Change.** Honour `issuesFetched` in `WebPlayer`; add a `fetched` flag to `customFieldStore` and gate on that instead of `length === 0`. Both are per-project, so key the flag by project and reset on project switch.

**Validate.** Open three sessions in a row in the same project → one `/integrations/issues` and one `/metadata` total. Switch project → both refetch once.

---

### FE-5 — The hidden header still polls
**Impact:** 1 request per session open, for a badge that is not on screen. **Effort:** XS. **Risk:** L.

**Evidence (verified).** `Layout.tsx` renders `<TopHeader />` inside `<div className={hideHeader ? 'hidden' : 'block'}>` — on the player route the header is invisible but mounted, so its effects run. Batch 1 removed `/limits` from that effect and deferred `/notifications/count` past first paint, but did not skip it.

**Change.** Pass `hideHeader` down (or read the same route condition) and skip the notifications fetch entirely when the header is hidden. The 5-minute poll in `Notifications.tsx:23-33` should be gated the same way.

**Validate.** Open a session → no `/notifications/count`. Go back to the list → it fires, badge correct.

---

## 3. Latency and main-thread

### FE-6 — Fire `/events` in parallel with `/replay`
**Impact:** −50 to −100 ms on the sidebar-ready path today; the real win arrives once BE-1 lands. **Effort:** S. **Risk:** M.

**Evidence (verified).** `sessionStore.ts:369-380` — `fetchSessionData` awaits `getSessionInfo`, constructs the `Session`, *then* calls `addSessionEvents(data, isLive)`. The events request needs only `sessionId`.

**Change.** Start both requests together; `await` replay for the `Session` construction and let the events promise resolve into `addSessionEvents` afterwards. The post-processing in `Session.addEvents` needs `startedAt` from the replay payload, so the *join* still waits for replay — only the network round-trip moves.

**Watch for.** `addSessionEvents` currently receives the replay `data` object. Decoupling means passing `sessionId` to the request and the replay payload to the merge step separately.

**Validate.** Waterfall shows `replay` and `events` starting in the same tier. Timeline, Events sidebar and X-Ray still populate correctly; no flash of empty lists after the replay resolves.

---

### FE-7 — Prefetch the lazy `Session` chunk on route match
**Impact:** part of the 444 ms before `/replay` even starts. **Effort:** S. **Risk:** L.

**Evidence.** `/replay` needs only route params + JWT, but waits for `account` → `projects` → the `Loader` release → the lazy `Components/Session/Session` chunk (`PrivateRoutes.tsx:23`). `account ∥ projects` is already fixed; the chunk load is what is left.

**Change.** Warm the dynamic import when the route matches (or on hover over a session row in the list, which is where most opens come from — `SessionItem` already has a hover prefetch for the mob file, `sessionStore.getFirstMob`).

**Validate.** Compare `doc → /replay start` across 3 runs, cold cache and warm.

---

### FE-8 — zstd decode blocks the main thread
**Impact:** 364 KB of `dom.mobe` decompresses synchronously while the UI is interactive. **Effort:** M. **Risk:** M.

**Evidence (verified).** `player/src/common/unpack.ts` calls `fzstd.decompress` / `fflate.gunzipSync` directly — no Worker anywhere in `player/src`.

**Change.** Move `unpack` into a Worker. The call sites already await a promise chain (`loadFiles.ts`), so the seam is clean.

**Validate.** Performance profile on a large session: no long task spanning the decode; `play()` still starts at the same point.

---

### FE-9 — `devtools.mob` loads whether or not DevTools is open
**Impact:** 30 KB + a decode on every replay open. **Effort:** S. **Risk:** M.

**Evidence (verified).** `MessageLoader.ts:438` calls `this.loadDevtools(devtoolsParser)` inside the standard load path, gated only on `isClickmap`.

**Change.** Defer until a DevTools panel actually mounts. Needs care: `getListsFullState()` is pushed into the store on completion, so late arrival must not clobber state the player has since advanced.

**Validate.** Open a session without touching DevTools → no `devtools.mob` request. Open the Network panel → it loads and populates.

---

### FE-10 — `html2canvas` is in the replay chunk
**Impact:** 40 KB on a route that only needs it when someone creates a highlight. **Effort:** XS. **Risk:** L.

**Evidence (verified).** `Session_/Highlight/HighlightPanel.tsx:16` statically imports from `App/utils/screenCapture`, which imports `@codewonders/html2canvas` at module scope.

**Change.** Dynamic-import `screenCapture` inside the capture handler.

**Validate.** Highlight capture still works; the replay route's chunk set drops `html2canvas`.

---

## 4. Dead code (verified dead at HEAD)

**Effort:** S. **Risk:** L.

- `sessionStore.fetchNotes` (`sessionStore.ts:478-480`) — no callers, and it calls `sessionService.getSessionNotes`, which **does not exist** on any service. It would throw if reached. (The live path is `notesStore.fetchSessionNotes`.)
- `sessionStore.host` (`sessionStore.ts:171`, written at `:473`, cleared at `:636`) — write-only; every `.host` reader in the app is `site.host` / `project.host`.

Not included: the duplicate `Session` classes (`app/types/session/session.ts` vs `app/mstore/types/session.ts`). Both are live with different consumers — consolidating is a real refactor, not a sweep.

---

## 5. Sequencing

| # | Item | Depends on | Effort | Ship alone? |
|---|---|---|---|---|
| 1 | FE-1 Issue `issueType` → `type` | — | XS | yes |
| 2 | FE-2 QueueControls page-2 race | — | XS | yes |
| 3 | FE-5 hidden-header notifications | — | XS | yes |
| 4 | FE-10 `html2canvas` dynamic import | — | XS | yes |
| 5 | Dead code (§4) | — | S | yes |
| 6 | FE-4 `issuesFetched` + `customFieldStore.fetched` | — | S | yes |
| 7 | FE-6 events ∥ replay | — | S | yes |
| 8 | FE-3 scope boot set off replay route | — | S | yes, needs care |
| 9 | FE-7 prefetch Session chunk | — | S | yes |
| 10 | FE-9 lazy `devtools.mob` | — | S | yes |
| 11 | FE-8 Worker zstd decode | — | M | yes |

**All eleven are frontend-only.** Items 1–7 are a clean first batch. Items 8–11 touch the player and route wiring and deserve their own pass.

---

## 6. What we need from backend

None of the above is blocked on backend. These are the backend items that dominate what is left, listed so the frontend work is not mistaken for the fix.

### BE-1 — `/events` costs 1,065 ms and sets the whole UI-ready path ★
This is the single biggest number on the page, and no frontend change moves it. From the audit §3.2:

- **Q5 joins `experimental.issues`**, which is `ORDER BY (project_id, issue_id, type)` and filtered only by `project_id` — so ClickHouse streams **every distinct issue of the project** (with `context_string`) to probe a hash built from one session's ISSUE events. Cost scales with project history, not session size. The join looks unnecessary: ingest already writes `context_string` into the ISSUE event's `$properties` (`backend/pkg/db/clickhouse/connector.go:685`).
- 6 CH queries, no `created_at` bound, so daily partitions cannot prune.
- 3 sequential PG round-trips before ClickHouse starts (auth, `IsExists`, `GetPlatform` — the last against a project row that is already cached in-process and in redis).
- Q1/Q4 materialise whole `$properties` / `properties` JSON objects instead of reading subcolumns.
- Errors in any lane are swallowed → a CH timeout returns `200` with empty arrays, which is indistinguishable from "this session had no events".

Expected: well under 300 ms. That is ~1 s off time-to-complete-UI, roughly 10× what the entire frontend batch buys.

### BE-2 — `issueTypes` arrives as a Postgres array literal
`/replay` scans `issue_type[]` into a Go `string` (`backend/pkg/session/session.go:60`), so JSON receives `"{custom,mouse_thrashing}"`. The frontend types it `string[]` (`session.ts:126`) and calls `.includes()` on it, which "works" as a substring match by accident.

**Ask:** return `[]string`. Independent of FE-1 — that one fixes the `/events` issue objects, this one fixes the `/replay` summary array.

### BE-3 — `issues[]` and `userEvents[]` duplicate each other
The tracker sends both `CustomEvent` and `CustomIssue` for the same action (`tracker/src/main/index.ts:566,578`), ingest writes both, and `/events` returns the pair. On the audited session, 12 of 16 issues were custom with timestamps identical to the 12 `userEvents`.

**Ask:** decide which is the source of truth and stop sending the other. The frontend consumes `userEvents` today; FE-1 will make the duplicate `issues` entries start rendering too, so this needs a decision **before or with** FE-1 to avoid doubled X-Ray rows.

> This is the one ordering constraint in the plan. If BE-3 cannot be answered quickly, FE-1 should de-duplicate client-side by `(timestamp, name)` as a stopgap, and that stopgap should be removed once BE-3 lands.

### BE-4 — Gzip and CORS on Go `/v2` (shared with `65-sessions-plan.md`)
- **Gzip:** `/events` 45.7 KB → 3.9 KB (91 %), whole page 88 KB → 14 KB (84 %). `gzhttp` already in `go.mod:28`; no frontend change.
- **`Access-Control-Max-Age`:** `middleware/builder.go:111-114` sets `Cache-Control: max-age=86400` on OPTIONS, which browsers ignore for preflights — the only header that counts is `Access-Control-Max-Age`, and it is absent. Result: a preflight on **every** Go call, forever. 7 of the 11 preflights on this page, 13–31 ms each, on the critical path of `/replay` and `/events`.

### BE-5 — `Cache-Control` on `/assets/*` (infra)
126 of 133 static responses carry no `Cache-Control`, so hashed chunks are revalidated (8 × 304 on this navigation) and everything else is subject to heuristic expiry. `public, max-age=31536000, immutable` on `/assets/*` via S3 metadata or a CloudFront response-headers policy.

### Out of scope for this repo
`/config/assist/credentials` is fetched on a recorded (non-live) session, and `POST /{project}/{id}/signals` is an authenticated project route used for fire-and-forget telemetry — but the OSS `SignalService` is a no-op stub (`services/SignalService.ts:1-9`) and the only OSS credentials caller is `LivePlayer.tsx:73-74` on the live route. **Both callers are SaaS-private.** Whoever owns that module should: fetch credentials only on the live route, and send signals via `navigator.sendBeacon` / `keepalive` through ingest rather than an authenticated Python route.

The audit also flags a latent data-loss bug there: `frontend_signals.session_id` is `integer` while session ids are `bigint`, so every batch carrying a real session id fails with `integer out of range` and the exception is swallowed at INFO level.

---

## 7. Measurement

Re-run the audit's capture script (Appendix D — CDP, login on `/{project}/sessions` via `window.setJWT`, `waitUntil: 'load'` plus fixed waits since the page never reaches networkidle, `ingest/v1/` excluded).

Baseline: **19 requests + 11 preflights, 94.5 KB API wire, 1.54–1.63 s doc → last response, replay playing at ~0.64 s.**
After the frontend batch: expect **~14 requests, ~57 KB**, replay starting earlier, and time-to-complete-UI still pinned at whatever `/events` costs — that number only moves with BE-1.
