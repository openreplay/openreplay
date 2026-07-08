# Test Agents — follow-up work

The redesigned UI is in place and wired to the **api2** schema (`api2.yaml`): native
`draft`/`active`/`paused` statuses, real `tags`, `config.resolutions`/`config.regions`,
`needsReview` + version suggestions, project settings, notifications, manual trigger,
bulk ops, and run HAR. Adapters live in `components/shared/adapters.ts` — new/changed
fields plug in there. This lists what's still open.

## Status transitions (biggest constraint)
- **Pause / Resume aren't writable.** api2 makes `active`/`paused` scheduler-owned — the
  only client-settable transition is `draft → approved/rejected`. So the drawer/row
  **Pause & Resume** actions update the VM optimistically but don't persist (the next
  refetch reverts them). Needs a real pause/resume endpoint (or a writable pause flag).
- **Schedule / Unschedule** persist as a `cron` change only (no status write); the
  scheduler promotes an approved+cron test to `active` and demotes it on clear. If the
  scheduler is slow, the row can read `approved` briefly after scheduling.
- **Draft approve** works (`draft → approved`, via `vmApproveRequest`); a manually-created
  test is created (`draft`) then approved with a follow-up update — a single
  create-with-status would drop the extra round-trip.

## Versions / review
- **Version history + switcher + per-step history** are UI-complete but unpopulated: the
  adapter fills `pendingRevision` from `Test.suggestion` and the review diff from
  `GET /versions/diff`, but `TestCase.history` (older snapshots) isn't loaded. Wire
  `GET /versions` (list) + `GET /versions/{id}` (per-version steps) into `apiTestToVM`/a
  hook to light up the version dropdown and the step-history popover.
- **Partial-accept decisions**: `saveRevision` sends `{ steps, decisions }` to
  `POST /versions/{id}/activate`; `decisions` is our own `{text,kind,decision}[]` shape
  (opaque to the backend). Confirm the runner/LLM wants that exact shape.

## Runs — capture & detail
- **`results.json` is wired** to the runner's real shape: `agent_steps` (index/action/
  status/`screenshot`/`user_step_text`/`failed_requests`), `final_result` (→ the Result
  summary), `errors` + `js_errors` (→ Console). Steps, screenshots, result and console now
  render (`apiRunDetailToVM`). Remaining:
  - **Console is error-only** — `errors`/`js_errors` map to error rows; there's no full
    console stream (info/warn/log) in `results.json`.
  - **Per-step network** — `agent_steps[].failed_requests` / `network_requests` and
    `unmatched_network` aren't surfaced; the Network panel is driven by the streamed HAR
    instead. Consider showing per-step request counts / failures inline.
  - **Run "failed" with no failed step** — the agent steps can all be `success` while the
    run fails on a semantic assertion (only `final_result` + a 4xx in `failed_requests`
    signal it). We show the summary; there's no per-step failure marker to highlight.
- **Screenshots render** — fetched as authed blobs → object URLs (`getRunScreenshot`),
  one per step. `results` exposes a single screenshot per step, so the multi-image
  carousel (`TestStep.shots`) is still one-per-step.
- **Run step version**: `RunListItem` carries no version, so the Runs table version chip
  and the version filter stay hidden. Add a version to the run row to light them up.

## Settings
- **Default environment** (Defaults picker) is session-local. The "default" is the
  environment with `isDefault: true` — wire the picker to `PUT /environments/{id}` with
  `isDefault` instead of only the ui store.
- **Notifications have no GET.** Only `PATCH /notifications` exists, so the daily/weekly
  switches start from a local default and can't reflect the saved value on load. Add a
  read (or fold the flags into `GET /settings`).
- **Project settings ↔ ui store**: `pauseOnRevision` + run defaults are read from the ui
  store (seeded when the Settings tab mounts). A project whose Settings tab was never
  opened uses the defaults (`pauseOnNewRevisions: true`, viewport/region null) — usually
  correct, but read `GET /settings` in Tests/TestDrawer directly to be exact.
- **Environment headers & "ignore HTTPS errors"** persist in the environment's
  `variables` record; the agent still has to honour them.
- **Delete environment** 409s while a test references it (no cascade). The confirm dialog
  lists the referencing tests and asks the user to reassign first.

## Available but not surfaced
- **Counts endpoints** (`/tests/counts`, `/runs/counts`) are wired in `api.ts` but unused
  — the tabs still count client-side over the loaded page. Swap in for exact totals on
  large projects.
- **"New" dot / `seenAt`**: the dot derives from `seenAt == null`, which the backend
  stamps on `GET /tests/{id}`. The list doesn't fetch a single test on open, so the dot
  won't clear until the test is fetched individually — call `getTest` on open to stamp it.
- **Run `batchId` / `dispatchMode`**: returned on runs but not shown in the table/drawer.
- **Per-test models** (`llmModel`/`extractionModel`/`fallbackModel`) are runner-managed
  (read-only); no UI.

## Agent insights (no API yet)
- **Alternatives** (`TestCase.alternatives`): agent-observed branches under a step — no
  API field.
- **Trend dots** in the test drawer's Runs section derive from `useAllRuns` filtered by
  `testId` (client-side over the loaded page); a per-test recent-runs endpoint would avoid
  loading the project-wide page.

## Server-side lists (now wired) — remaining rough edges
Tests & Runs paginate / filter / sort **server-side**, and the tab badges come from the
`/tests/counts` + `/runs/counts` aggregates (absolute totals). What the API can't express:
- **Tests sort**: only `name` is column-sortable (server `sortField` = name/date only);
  the Environment / Schedule / Status columns are no longer sortable.
- **Runs sort**: only Duration (`duration_ms`) + When (`started_at`); Result / Test aren't
  server-sortable.
- **Runs status filter is coarse**: the 3 UI buckets map to a single server status each
  (`running`/`failed`/`passed`), so `dispatched` / `error` / `timeout` runs show under
  **All** only. Counts collapse correctly (accurate badges); the filter needs the API to
  accept multiple statuses (or the UI to expose the 6 raw statuses).
- **Drafts-first ordering** is gone (server default is `created_at desc`); "float drafts /
  needs-review to the top" would need a server sort option.
- **Rejected tests**: no "not rejected" filter, so the `All` tab hides them client-side
  (rare — our dismiss soft-deletes rather than rejecting).
- Selection clears on filter/page change (it only spans the current page).

## API gaps — must add to fully support the current UI
The UI already renders/attempts these; the backend doesn't support them yet.

- **Pause / Resume**: a writable pause — either allow `active ↔ paused` on `PUT /tests`
  or add a `paused` flag / `POST /tests/{id}/pause|resume`. The drawer + row + bulk
  Pause/Resume controls are non-persistent without it (revert on refetch).
- **`GET /browser-tests/notifications`**: only `PATCH` exists, so the Daily/Weekly
  switches can't load their saved state (start from a local default). Add a read, or fold
  the flags into `GET /settings`.
- **Per-version steps for the switcher/history**: `Test` should carry `history`
  (or `GET /versions` should return each version's `steps`, not just the lean list) so the
  version dropdown + per-step history popover can populate. Today only the pending
  suggestion's diff is fetched.
- **`RunListItem.version`**: the step version a run executed — needed for the Runs table
  version chip and the version filter (both stay hidden without it).
- **`POST /tests` accepting `status`** (or a create-as-`approved`): manual "Add test"
  currently creates a `draft` then fires a second `PUT` to approve.
- **Default environment**: expose it as a settings field, or the Defaults picker must
  write `PUT /environments/{id}` `isDefault` — it's session-local today.
- **Full console stream** in `results.json` (info/warn/log, not just `errors`/`js_errors`)
  and **multi-screenshot per step** (`screenshots[]`) — the carousel + Console render what
  the runner provides today (one shot/step, error-only console).
- **Agent insights**: `alternatives` on a test, and per-test recent-runs / `lastResult`
  trend (the drawer trend strip loads the project-wide runs page client-side).

## api2 capabilities the UI does NOT use (yet)
Available server-side; noted so they aren't mistaken for gaps.

- **`from` / `to` date-range filters** (tests + runs) and the runs `dispatchMode` /
  `batchId` filters — the list endpoints accept them, but there's no UI control yet.
- **Run `batchId` / `dispatchMode`** — returned on runs, not shown in the table/drawer.
- **Per-test models** (`llmModel`/`extractionModel`/`fallbackModel`) — runner-managed,
  read-only; no UI.
- **Version metadata** — `source` (runner/user), `originRunId`, `reviewedFrom`,
  `reviewDecisions`, and the full `GET /versions` history aren't surfaced.
- **Environment `isActive`** — not exposed in the environment form.
- **Run `containerId` / `s3Prefix`** — internal plumbing, unused.
