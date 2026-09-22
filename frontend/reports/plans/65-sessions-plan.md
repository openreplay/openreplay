# /65/sessions — remaining work

Source audit: `frontend/reports/65-sessions.html` (2026-09-15, code baseline `2e8097749`).
Frontend batch 1 (FE-1/2/3/6/7/8/9) shipped on `a018a7045` — see git history, not repeated here.

**Everything below is blocked on a backend decision.** Nothing in this file can be finished frontend-side alone.

---

## Where the page stands now

| | Before | After batch 1 | Target |
|---|---|---|---|
| API calls at boot | 8 | 6 (5 blocking + deferred notifications count) | 5 |
| Doc → sessions rendered | 245–313 ms | `sessions/search` no longer queues behind `/filters` | — |
| API wire bytes | 44.6 KB | unchanged — all of it is backend | ~12.5 KB |

The whole remaining latency and byte budget is backend-side. `/filters` at 25 KB uncompressed is still the largest single response on the page.

---

## Pending item 1 — saved-search list is silently truncated

**Severity: real bug.** Invisible on project 65 (5 saved searches); breaks at 21.

**What the frontend does.** `searchStore.ts:27` `SAVED_SEARCH_PAGE_SIZE = 200`, passed as `limit` to `GET /v2/api/{projectId}/sessions/search/saved`. The whole list is deliberately loaded in one request — it is shared by session search, Data Management and the Issues capture layer, and `SavedSearchModal.tsx` pages over it locally at 100.

**What the backend does.** `backend/pkg/analytics/saved_searches/handlers.go:153-159` accepts `limit` only when `0 < l <= 100`; anything else **silently** falls back to 20. The captured response echoes `"limit": 20`. So a project with more than 20 visible saved searches loses rows from the picker with no error anywhere.

### Needed from backend

1. **Reject instead of swallowing.** Return `400` on an out-of-range `limit`. The current silent fallback is what made this invisible.
2. **Decide the real cap**, and tell us the number. Two options, and the frontend work differs:
   - Cap raised to ≥ 200 → frontend sets `SAVED_SEARCH_PAGE_SIZE` to the agreed value. One-line change.
   - Cap stays 100 → frontend switches `SavedSearchModal` to server-side paging and reads `total` from `savedSearchTotal` (already stored, `searchStore.ts:198`). Half a day.

Also worth fixing while in that handler, from the audit (§3.7) — not blocking us:
- `expires_at` / `deleted_at` are selected but never returned (`json:"-"`), and are constant by the `WHERE`.
- `sessionsCount` / `usersCount` are N+1 sequential ClickHouse queries, one per row, hidden behind a per-pod 30-min cache. Consider `?withStats=1` opt-in — the sessions page drops both fields on the floor.

**Frontend, once answered:** `searchStore.ts:27` + possibly `SavedSearchModal.tsx:10,64-66`. Validation: seed >20 and >100 saved searches on a test project, confirm the modal shows all of them and `total` matches.

---

## Pending item 2 — `errorsCount` / `pagesCount` / `issueTypes` are always empty

**Severity: the list renders a control that can never show anything.**

The Go `Session` struct (`backend/pkg/analytics/model/model.go:135-171`) declares `ErrorsCount`, `PagesCount`, `IssueTypes`. The ClickHouse `SELECT` (`backend/pkg/analytics/search/search.go:55-92`) does not select `errors_count`, `pages_count` or `issue_types` — **all three columns exist in `experimental.sessions`**. Every row therefore returns `errorsCount: 0`, `pagesCount: 0`, `issueTypes: null`, and `SessionItem.tsx:448` renders `<ErrorBars count={issueTypes?.length} />` — permanently empty on this route.

### Needed from backend

Pick one, we implement the matching side:

- **Select the columns.** Frontend needs nothing; `ErrorBars` starts working as designed. Cost: three more columns in a query that already materialises every matching row.
- **Drop the fields from the JSON.** Frontend removes `ErrorBars` from `SessionItem` and the dead `errorsCount`/`pagesCount` handling.

We are not defaulting these frontend-side — that would hide the mismatch rather than settle it.

---

## Pending item 3 — `/filters` is 25 KB and half of it is constant

**Severity: largest response on the page; ~54 % of it is identical for every project, user and request.**

Measured breakdown (audit §3.6): `session` + `user` + `users` sections = 13.6 KB, constant across all projects, **including the 249-entry country list twice**. On top of that, 60 items carry `"possibleValues": []`, 38 carry the internal `_foundInPredefinedList` flag, and `segments` duplicates what `/sessions/search/saved` already returned.

This is no longer on the critical path (FE-1 unblocked the search), so it is a bytes problem, not a latency problem.

### Needed from backend — in this order

1. **Verify the suspected ClickHouse bug first, before anyone optimises anything.**
   `backend/pkg/analytics/filters_catalog/ch_properties.go:29` filters on `apc.status = 'visible' OR isNull(apc.status)`. `apc.status` is `LowCardinality(String)` and non-nullable (`clickhouse/create/init_schema.sql:539`); with ClickHouse's default `join_use_nulls=0` a non-matched `LEFT JOIN` yields `''`, never `NULL`. So `isNull(apc.status)` can never be true and the property catalog degenerates to customised rows plus 25 hard-coded fallbacks. The events query one file over correctly uses `aec.status = ''`.
   The captured payload is consistent with this: `event.list` has exactly 3 items without `isPredefined` (the real CH rows) and 25 predefined fallbacks.
   **Check `SELECT value FROM system.settings WHERE name='join_use_nulls'` on prod.** If confirmed, the fix is one token (`apc.status = ''`) — and **the payload changes shape**, which is why nothing else should be sized until this is answered.

2. **Gzip the Go responses.** `gzhttp` from `klauspost/compress` is already in `go.mod:28`; the middleware chain in `backend/pkg/server/middleware/builder.go:69` has none. Measured: `/filters` 25,018 → 5,385 B (78 %), whole-page API wire 44.6 KB → ~12.5 KB (80 %). No frontend change at all.
   Note the ingress `use-gzip: "true"` in `scripts/helmcharts/vars.yaml:101` is an ingress-**nginx** key and this chart runs the NGINX Inc. controller, which ignores it — observed headers confirm no `content-encoding` on any `/v2/api` response.
   **This may make item 3 moot.** Gzipped, the constant 13.6 KB costs about 1.5 KB. Decide whether the static split below is still worth doing after gzip lands.

3. **Then, if still worth it:** move the constant `session` / `user` / `users` sections out of the per-project response — either to a `GET /filters/static` with `ETag`/`Cache-Control`, or to a frontend constant. Drop `_foundInPredefinedList`; `omitempty` on `possibleValues`, `isPredefined`, `isConditional`.

**Frontend, once answered:** consume the static sections from wherever they end up, and replace the `...feature` / `...segment` spreads in `filterStore.processFilterResponse` (`filterStore.ts:505-506,520-527`) with explicit field picks. Deliberately not done ahead of time — that change only affects in-memory retention, not wire bytes, and `isConditional` / `isSegment` / `searchId` are read from those same spreads by other screens.

---

## Open question — the "new sessions" poll narrows a window the backend ignores

Not a blocker, needs a product call rather than a fix.

`searchStore.checkForLatestSessionCount()` (`searchStore.ts:496-501`) builds a `Period` from `latestRequestTime` and sets `filter.startDate` / `filter.endDate` to poll only for sessions since the last search. `SessionsSearchRequest` binds neither key, so that narrowing has never taken effect — the poll asks for the full original range.

It works anyway, because the count is derived as `response.total - sessionStore.total`, comparing two full-range totals. **Sending `startTimestamp`/`endTimestamp` instead would make `total` the count within the delta window and break that subtraction.**

So: either delete the dead `Period` block (behaviour-neutral, makes the code honest), or redesign the poll around a delta window and change the comparison. Left untouched pending that decision.

---

## Measurement

Re-run `capture.js` from the audit appendix (Playwright + CDP, 3 runs, `window.setJWT` login) against `/65/sessions` and diff the waterfall.

Original baseline: **8 requests, 44.6 KB, 245–313 ms doc → sessions loaded.**
Batch 1 is a request-count and ordering win; the byte and server-time budget is entirely in the three items above.
