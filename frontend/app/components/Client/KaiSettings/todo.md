# Test Agents — open items

The redesign is built and wired to `api3.yaml`. This lists only what's still to add or
fix. Adapters live in `components/shared/adapters.ts`; data hooks in `queries.ts`.

## Ask backend — API changes
- **Status-transition contract is self-contradictory (blocker).** The `TestStatusSettable`
  schema says accepted transitions are `draft → approved/rejected` **and the `active ⇄
  paused` pause/resume toggle**; but the `PUT /tests/{testId}` description says the opposite
  — *"only `draft → approved/rejected` is settable … `active`/`paused` are scheduler-owned
  and never writable here."* The whole Pause/Resume UI (test drawer + row menu + bulk) writes
  `status: paused`/`active` through this PUT, so we need a definitive answer. Assuming the
  schema is the truth (pause/resume IS settable), we widen our `TestStatusSettable` type to
  the 5 values so it compiles and persists; if the PUT prose is the truth instead, pause/
  resume has **no backend** and needs a dedicated endpoint. Please reconcile the two.
- **Run environment + region aren't exposed.** `RunListItem` / `RunDetail` carry neither the
  environment the run used nor its region (only `screenType` → viewport). So the run drawer's
  env + region meta line is always blank, and we had to drop the Runs-table **Environment
  column** and the **Environment + Region filters** the design called for. Add `environment`
  (id or name) and `region` to the run item (or expose them in `results.json`), plus an
  `environmentId` / `region` filter param on `GET /runs` if those filters should return.
- **`needsReview: true` without a `suggestion`.** Real data returns tests flagged
  `needsReview: true` while `suggestion`, `activeVersion` and `latestVersion` are all
  `null`. Per the docs `needsReview` is set with a pending version and cleared by
  activate/dismiss — so with no suggestion there's nothing to diff and no `versionId` to
  clear it with, and the test is stuck "needs review". Either always attach the
  `suggestion`/version when flagging, or expose a way to clear the flag (or clarify what
  `needsReview` means for a freshly-imported test with no versions).
- **`needs_review` as a list filter.** `tests/counts?aggregator=status` buckets it, but the
  list `status` param enum (`draft|approved|rejected|active|paused`) has no `needs_review`,
  so we can't ship the design's **"Needs review" filter tab** (the count exists; the filter
  doesn't). Need a `needsReview=true` query param (or `needs_review` accepted by `status`).
- **Multi-value run status filter.** `GET /runs` `status` takes one value. The UI's coarse
  buckets — running = `dispatched`+`running`, failed = `failed`+`error`+`timeout` — can't
  be filtered server-side. Need a multi-status filter (comma list) or accept coarse.
- **Delete-environment cascade.** `DELETE /environments/{id}` returns `409` while a test
  references it; there's no server-side detach or "pause tests & delete". Today the UI
  lists the referencing tests and asks the user to reassign first (the design wanted a
  one-click "pause dependent tests & delete").
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
- **(optional) A versions-with-steps bulk endpoint.** The drawer's per-step inline history
  (what a step said in earlier versions) was dropped because reconstructing it means one
  `GET /versions/{id}` per version. A single response carrying every version's steps would
  let us restore it cheaply.

## Frontend to do (no backend needed — endpoints exist)
- **`to` end-date + `batchId` filters** — the date filter is presets only (`from` lower
  bound); an end date and a `batchId` drill-down aren't built (`batchId` is better as a
  "show sibling runs" action than a filter box).

## Known limitations (accepted, from server-side lists)
- Column sorting is limited to what the server sorts: Tests by name (the API also allows
  `created_at`/`updated_at`/`last_run_at`/`next_run_at` — not yet exposed as sort options);
  Runs by Duration / When only. Environment / Schedule / Status / Result columns aren't
  sortable.
- No drafts-first / needs-attention-first ordering (server default `created_at desc`).
- Rejected tests are hidden client-side (no "not rejected" filter; rare — dismiss deletes).
- Row selection spans the current page only (clears on filter/page change).
- A run can be `failed` with every step `success` (semantic failure) — we show the
  `final_result` summary; there's no per-step failure marker in that case.
</content>
</invoke>
