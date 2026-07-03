# Test Agents — follow-up work

The redesigned UI is fully in place. This lists what's still open: mostly missing
backend (rendered as empty states or local-only until the API/agent supports it), plus
a few frontend follow-ups where data exists but isn't surfaced yet. Adapters live in
`components/shared/adapters.ts` — that's where new fields plug in.

## Test lifecycle
- **Native `draft` / `active` status.** UI models `draft → approved → active → paused`,
  but the API only stores `pending | approved | rejected | paused`. `adapters.ts` maps
  `pending↔draft` and derives `active` from an approved test carrying a `cron`. Consider
  adding real `draft`/`active` statuses server-side so the state isn't inferred.
- **Dismiss vs. reject.** Dismissing a draft calls `deleteTest`. The old "rejected" state
  is filtered out of the list; decide whether dismiss should soft-reject instead.
- **`isNew` unreviewed dot.** Currently derived as `pending && !lastRunAt`. No per-user
  "seen" tracking, so the dot can't clear on open without a persisted flag.

## Tags
- No API field. `TestCase.tags` / `RunData.tags` are UI-only; the tag editor and table
  column render but edits don't persist (`vmToUpdateRequest` drops them). The Runs tag
  filter was removed (runs carry no tags); the Tests tag filter stays but is empty until
  a `tags` field exists on tests (and ideally runs).

## Run matrix (resolution / region)
- **Resolution — partly backed.** Runs carry `screenType` (mobile/tablet/desktop) → the
  Runs resolution column/filter and the run drawer are real. Tests persist a *single*
  resolution via `config.screen_type` (`adapters.ts`), but the UI offers a multi-select
  matrix — only the first value is saved. Needs a real `resolutions[]` on tests for the
  full matrix.
- **Region — not backed.** No API field on tests or runs; the run-settings region
  multi-select stays non-persistent and the Runs region filter was removed (runs carry
  no region). The Runs env filter was likewise removed (runs have no environment link);
  only the resolution filter works there now (via `screenType`).

## Runs — DevTools capture
- **Network (HAR) panel**: parsing is done — `harToNetworkRequests` (`adapters.ts`, backed
  by `shared/harParser.ts`) turns a `.har` file into the `NetworkRequest[]` the panel
  renders. Still needs the run to expose its captured HAR (a field/URL on `RunDetail`);
  then feed it through `apiRunDetailToVM` → `network`.
- **Console panel** in `RunDrawer` shows an empty state — the run detail API returns no
  `console`. Wire it in `apiRunDetailToVM` once captured.
- **Per-step multiple screenshots** (`TestStep.shots`): API exposes a single `screenshot`
  per step; the carousel supports many.
- **Per-run environment / tags**: runs carry no `envName`/`tags`, so the Runs env & tag
  filters and the run drawer meta line stay blank.

## Actions with no endpoint
- **Run now** (tests) and **Rerun** (runs) only show a toast — no dispatch endpoint.
- **Bulk approve/pause/resume/delete** fan out to individual `updateTest`/`deleteTest`
  calls. A batch endpoint would be cheaper.
- **Manual test creation** ("Add test"): `POST /tests` takes no `status`, so a hand-made
  test is created (lands `pending`) and then a follow-up `PUT` lifts it to `approved`
  (see `TestsTab.commitCreate` + `vmToCreateRequest`). A single create-with-status would
  drop the extra round-trip.

## Settings
- **Default run configuration** (`Defaults.tsx`: default environment / viewport / region)
  now pre-fills new drafts and manually-created tests (shown as "(default)" in the run
  settings until changed) — but it lives in `shared/uiStore.ts` (in-memory, per session)
  because there's no endpoint to persist per-project run defaults. Wire it once the API
  can store/return them.
- **Notifications** (Daily / Weekly summary switches) are local-only — no
  notification-preference endpoint.
- **Environment headers & "ignore HTTPS errors"** are stored in the environment's
  `variables` record (so they persist), but the test agent must actually honour them.
- **Delete environment**: the API 409s when a test still references it (no cascade). The
  confirm dialog lists the referencing tests and asks the user to reassign them first; a
  cascade "pause tests & delete" would need backend support.
- **Download .HAR** (run drawer network panel) is a stub toast — no HAR export endpoint
  (and no captured network to export yet).

## Available but not yet surfaced
- **Per-test models** (`llmModel` / `extractionModel` / `fallbackModel`) and **`config`**
  (auth / screen_type / ssl_enforce / locale) exist on the Test model and are carried
  through updates (`config` is preserved; only `screen_type` is written from the
  resolution picker). No dedicated UI to edit models / auth / locale yet.
- **Run `batchId` / `dispatchMode`**: returned on runs (fan-out grouping, launch mode)
  but not shown in the Runs table or drawer.

## Agent insights
- **Alternatives** (`TestCase.alternatives`): agent-observed branch notes rendered under a
  step in `EditableSteps`. No API field yet.
- **Trend dots + most-recent-failure** (test drawer "Runs" section): now derived
  client-side from `useAllRuns` filtered by `testId` (last 10 completed runs). Works, but
  it loads the project-wide runs page and filters in memory; a per-test recent-runs
  endpoint (or `lastResult` / `recent` on the tests response) would avoid that.

## Known limitations
- Tests/Runs load one API page (`limit` capped at 100) and filter/sort/paginate
  client-side; past 100 a "showing first N" note appears. Move to server-side
  pagination/sort/filter for large projects.

## API gaps (checklist for backend)
- Status transitions too strict: only `pending → approved/rejected/paused` (+ no-op) is
  allowed, so the redesign's Pause/Resume/Unschedule on an approved test
  (`approved ↔ paused`) returns 400. Need the full transition matrix.
- Missing `draft` + `active` values in `TestStatus` enum.
- Missing `tags: string[]` prop in `Test` / `TestCreateRequest` / `TestUpdateRequest`.
- Missing `tags: string[]` prop in `Run` / `RunListItem`.
- Missing `resolutions: string[]` prop in `Test` (only single `config.screen_type` today).
- Missing `regions: string[]` prop in `Test`; missing `region` prop in `Run` / `RunListItem`.
- Missing `environmentId` (+ resolved `environmentName`) prop in `Run` / `RunListItem`.
- Missing `network` (HAR) prop in `RunDetail`.
- Missing `console` logs prop in `RunDetail`.
- Missing multi-screenshot support: `RunStep.screenshot` is single, no `screenshots[]`.
- Missing `seenAt` / `reviewedAt` prop in `Test` (to clear the "new draft" dot per user).
- Missing `alternatives` prop in `Test` (agent-observed branches).
- Missing `lastResult` + `recent: RunStatus[]` props in `Test` (health/trend).
- Missing `POST /tests/{testId}/runs` (or `/runs`) request to trigger a run now / rerun.
- Missing bulk `PUT /tests` (or `PATCH`) request to update/delete many tests at once.
- Missing `status` on `POST /tests` (create seeds `pending`; manual "Add test" needs a
  second `PUT` to reach `approved` — see `TestsTab.commitCreate`).
- Missing per-project run-defaults persistence (e.g. `GET`/`PUT /browser-tests/defaults`
  for default environment / viewport / region — currently in-memory `shared/uiStore.ts`).
- Missing environment-delete cascade: `DELETE /environments/{id}` 409s while a test
  references it (no server-side detach / "pause tests & delete"), so the UI asks the user
  to reassign first.
- Missing per-test recent-runs (or `lastResult` + `recent`) so the test-drawer trend strip
  doesn't have to load & filter the project-wide runs page client-side.
- Missing notification-preferences request (e.g. `GET`/`PUT /browser-tests/settings`).
