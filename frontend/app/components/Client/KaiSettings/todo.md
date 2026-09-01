# Test Agents — backend notes

## Wired to real API

- Tests list / runs / environments / versions / settings — `/{projectId}/browser-tests/*`.
- Project settings (run defaults + `pauseOnNewRevisions`) — `GET/PATCH /{projectId}/browser-tests/settings`. Unchanged by the settings refactor.
- Per-user notifications — moved OUT of browser-tests (saas commit `3255a85`):
  - `GET /{projectId}/notifications` → whole tree (agents the caller may see).
  - `PATCH /{projectId}/notifications/{agentKey}` → one agent's events.
  - Tests slice: `tests.failedRuns.{email,slack}` (email defaults on). Now wired on Preferences > Agents > Tests.

## Not implemented server-side yet

- **Notification senders.** The `usernotifications` package is config-only — no cron reads these preferences yet, so toggles persist but nothing is delivered until the senders land.

## Other branches (not this scope)

- Issues + Audits agent tabs on Preferences > Agents (their notification slices — `issues.newIssues`, `audits.auditReady` — already exist in the same tree).
- Smart Issues project capture flag `captureSegmentsOnly` — `GET/PATCH /smart-issues/{projectId}/settings`. Belongs to the segments/issues surface.
