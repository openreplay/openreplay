# Test Agents — backend gaps

API additions the frontend already expects (UI built, no field to bind to).

## Notifications (`/notifications`)

- `failedRunEmail: boolean` — per-event "test run failed" email, separate from the daily/weekly digest.
- `failedRunSlack: boolean` — same event over Slack.
- Slack as a delivery channel for test notifications (no Slack field exists today).

## Agents preferences

- Issues agent: journey-tag manager + critical-rules definitions (separate branch, separate endpoints).
- Audits agent: notification prefs.
