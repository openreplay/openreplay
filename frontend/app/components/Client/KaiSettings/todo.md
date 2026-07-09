# Test Agents — open items

The redesign is built and wired to `api3.yaml`. This lists only what's still to add or
fix. Adapters live in `components/shared/adapters.ts`; data hooks in `queries.ts`.

## Needs backend (API missing)
- **Version steps / history** — the version switcher + per-step history popover are built
  but unpopulated: `GET /versions` is lean (no `steps`) and `Test` carries no `history`.
  Need per-version `steps` (on the test, or a fetch) — today only the pending-suggestion
  diff (`GET /versions/diff`) is loaded.
- **`POST /tests` `status`** — create seeds `draft`, so manual "Add test" fires a second
  `PUT` to approve. A create-with-status (or create-as-`approved`) drops the round-trip.
- **`needs_review` list filter** — `tests/counts` buckets it, but the list `status` filter
  enum has no `needs_review`, so a Needs-review tab can't server-filter (badge only).
- **Multi-value run status filter** — the runs `status` param takes one value, so the
  coarse UI buckets (running = dispatched+running, failed = failed+error+timeout) can't
  filter server-side. Needs a multi-status filter (or expose the 6 raw statuses).
- **Full console stream** in `results.json` — only `errors`/`js_errors` (error rows)
  today; no info/warn/log stream for the Console panel.
- **Multi-screenshot per step** (`screenshots[]`) — `results` gives one screenshot/step;
  the carousel supports many.
- **Agent `alternatives`** — no API field for agent-observed branches (rendered per step).
- **Per-test recent-runs / `lastResult` trend** — the drawer trend strip loads the
  project-wide runs page and filters client-side; a per-test endpoint would avoid that.
- **Delete-environment cascade** — `DELETE /environments/{id}` 409s while a test references
  it (no cascade); the dialog asks the user to reassign first.
- **Runner must honour** env `headers` / "ignore HTTPS errors" (stored in `variables`).

## Frontend to do
- **Version switcher / metadata** — the switcher dropdown + per-step history are built but
  the version list isn't loaded. Wire `useVersions` (`GET /versions`) to populate the
  dropdown + metadata (`source`/`originRunId`/dates). The read-only snapshot of an old
  version additionally needs per-version `steps` (backend — see "Version steps / history").
- **`to` (range end) + `batchId` filters** — the date filter is presets only (`from` lower
  bound); an explicit end date and a `batchId` drill-down aren't built. `batchId` is a
  fan-out group id — better as a "show sibling runs" action than a filter box.

## Known limitations (accepted, from server-side lists)
- Tests are column-sortable by name only; Runs by Duration / When only (server `sortField`
  limits). Environment / Schedule / Status / Result / Test columns aren't sortable.
- No drafts-first ordering (server default `created_at desc`).
- Rejected tests are hidden client-side (no "not rejected" filter; rare — dismiss deletes).
- Row selection spans the current page only (clears on filter/page change).
- A run can be `failed` with every step `success` (semantic failure) — we show the
  `final_result` summary; there's no per-step failure marker in that case.
