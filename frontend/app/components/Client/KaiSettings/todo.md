# Test Agents — open items

The redesign is built and wired to `api4.yaml`. All API-side asks from the earlier review
are resolved (5-value status transitions, run env/region fields + filters, `needsReview`
clear + filter, comma run-status filter, force-delete cascade, create-with-status, inlined
`lastRun`). What's left is runner work (outside this repo) and a couple of frontend items.

## Ask backend — runner / results.json (outside this repo)
- **Populate the run `environmentId` + `region` columns.** The API returns both on
  `RunListItem`/`RunDetail`, and the UI is wired for them (Runs Environment column,
  Environment + Region filters, run-drawer meta). They read `null` until the runner writes
  the two new `test_runs` columns — same pattern as `version`. Until then those cells/filters
  show "Not set" / return nothing.
- **Agent-step → user-step grouping is sometimes wrong.** A failed request can be attributed
  to the wrong step: e.g. the login `POST /api/login` (401) is grouped under the agent step
  whose `user_step_index` is the *navigate* step ("Goto url") instead of "try to login".
  `user_steps[].agent_steps`, `agent_steps[].user_step_index`, and the request timestamp all
  agree it belongs to the navigate step — so the mislabel is in the runner's grouping, and
  the UI has no signal to correct it. The UI renders it faithfully (amber network warning,
  not a step failure), but the grouping should map the login action to the right user step.
- **Full console stream.** `results.json` exposes only `errors` + `js_errors` (error rows);
  no info/warn/log stream for the run Console panel.
- **Agent `alternatives`.** No field for agent-observed branches (the UI renders them per
  step when present).
- **Honour env `headers` + "ignore HTTPS errors".** Stored in the environment's
  `variables`; the runner has to actually apply them.

## Frontend to do (no backend needed — endpoints exist)
- **`to` end-date + `batchId` filters** — the date filter is presets only (`from` lower
  bound); an end date and a `batchId` drill-down aren't built (`batchId` is better as a
  "show sibling runs" action than a filter box).
- **(optional) Surface the inlined `lastRun`.** api4 inlines `Test.lastRun` (last run's
  status/version/times); not yet shown — wire it if we add a per-test "last result" column
  or headline (would also save the drawer trend a call for the single latest run).

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
