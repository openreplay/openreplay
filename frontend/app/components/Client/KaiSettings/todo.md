# Test Agents — open items

The redesign is built and wired to `api3.yaml`. This lists only what's still to add or
fix. Adapters live in `components/shared/adapters.ts`; data hooks in `queries.ts`.

## Ask backend — API changes
- **`needs_review` as a list filter.** `tests/counts?aggregator=status` buckets it, but the
  list `status` param enum (`draft|approved|rejected|active|paused`) has no `needs_review`,
  so the Needs-review count can't drive a filterable tab. Need a `needsReview=true` query
  param (or `needs_review` accepted by the status filter).
- **Multi-value run status filter.** `GET /runs` `status` takes one value. The UI's coarse
  buckets — running = `dispatched`+`running`, failed = `failed`+`error`+`timeout` — can't
  be filtered server-side. Need a multi-status filter (comma list) or accept coarse.
- **Delete-environment cascade.** `DELETE /environments/{id}` returns `409` while a test
  references it; there's no server-side detach or "pause tests & delete". Today the UI
  lists the referencing tests and asks the user to reassign first.
- **(optional) `POST /tests` `status`.** Create seeds `draft`, so manual "Add test" fires a
  second `PUT` to approve. A create-with-status (or create-as-`approved`) drops the extra
  call. Not blocking.
- **(optional) Inline `history` and `lastResult`/`recent` on `Test`.** Both are already
  fetchable (`GET /versions/{id}`, `GET /tests/{id}/runs`); inlining a summary would save
  the extra round-trips the version switcher + drawer trend otherwise make.

## Ask backend — runner / results.json
- **Full console stream.** `results.json` exposes only `errors` + `js_errors` (error rows);
  no info/warn/log stream for the run Console panel.
- **Multiple screenshots per step** (`agent_steps[].screenshots[]`) — one screenshot per
  step today; the carousel supports many.
- **Agent `alternatives`** — no field for agent-observed branches (the UI renders them per
  step when present).
- **Honour env `headers` + "ignore HTTPS errors"** — stored in the environment's
  `variables`; the runner has to actually apply them.

## Frontend to do (no backend needed — endpoints exist)
- **Version switcher / history** — wire `GET /versions` (list → dropdown + `source`/dates)
  and `GET /versions/{id}` (steps → the read-only old-version snapshot). Built, unwired.
- **Per-test trend** — the drawer trend strip filters the project-wide runs page
  client-side; switch it to `GET /tests/{testId}/runs`.
- **`to` end-date + `batchId` filters** — the date filter is presets only (`from` lower
  bound); an end date and a `batchId` drill-down aren't built (`batchId` is better as a
  "show sibling runs" action than a filter box).

## Known limitations (accepted, from server-side lists)
- Tests are column-sortable by name only; Runs by Duration / When only (server `sortField`
  limits). Environment / Schedule / Status / Result / Test columns aren't sortable.
- No drafts-first ordering (server default `created_at desc`).
- Rejected tests are hidden client-side (no "not rejected" filter; rare — dismiss deletes).
- Row selection spans the current page only (clears on filter/page change).
- A run can be `failed` with every step `success` (semantic failure) — we show the
  `final_result` summary; there's no per-step failure marker in that case.
