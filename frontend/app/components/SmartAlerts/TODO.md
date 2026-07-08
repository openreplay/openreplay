# AI Issues (SmartAlerts) — remaining work

The redesign is now wired to the **real** Go `/v2/smart-issues` endpoints
(see `api.yaml` for the contract and `api.ts` for the client). Filtering,
sorting and pagination are **server-side**; mutations persist and then refetch.

Backend→view-model mapping lives in **`factories.ts`** (`makeIssue`,
`makeIssueSessionCard`) — the single place to update when fields change.

Remaining backend gaps are still tagged in code:

```
grep -rn "WAITING BACKEND" app/components/SmartAlerts
```

---

## 1. Backend — remaining data-contract gaps

| Field we need | Default now | UI effect while missing |
|---|---|---|
| `suggestedFix` (per-issue) | `fix = ''` in `makeIssue` | "Suggested fix" section hidden on the player Details tab |
| short per-session `variation` headline | falls back to `description` → `journey` | redesign wants a 1-line headline distinct from the longer journey (`makeIssueSessionCard`) |
| per-row **hidden / deleted flag** on `Issue` | inferred from the active `visibility` filter | when `visibility='all'` we can't mark which rows are hidden/deleted; the "Hidden"/"Deleted" row tags only show under the matching single-visibility view |
| explicit **per-issue category** | derived locally from `issueLabels` ratios | `cat`/`categories` computed in `factories.ts` (Errors/UI/UX/Slowness by ratio); replace with server categories when available |

Now **provided** by the contract (previously stubbed): real `critical` flag,
`lastSeen`/`firstSeen`, `count`, `impactedSessions`, and `issueDescription`
(problem text, via `GET …/issue`).

## 2. Filter-semantics caveats (server-side)

The API exposes a **single** `labelsMatch` that applies to *both* the issue-label
and journey-label filters, and there is **no dedicated critical-only param**:

- **Category tab** → sent as `issueLabels` (single category).
- **Critical only** → appends the `'critical'` pseudo-label to `issueLabels`.
  This matches issues *labelled* critical; issues made critical purely via the
  `critical` override (no label) may be missed. Confirm the server includes
  override-critical issues in `issueLabels:['critical']`, or add a real
  `critical` filter param.
- **Journey labels** → `journeyLabels` with `labelsMatch = AND/OR` (the match
  toggle). Because `labelsMatch` is shared, mixing an OR journey-label filter
  with category+critical isn't perfectly expressible — acceptable for beta.
- **Category tabs have no counts.** A list load is a **single** request; the
  faded per-tab counts were removed because they'd need one `limit:1` query per
  category (a 4-request fan-out per filter change). To bring them back cheaply,
  add a server counts-by-category endpoint (or a `categoryCounts` field on the
  list response) and render it on the tabs.
- **Create ticket (Jira)** — the button on the detail page is UI-only. Wire it to
  the Jira/ticket integration (project/issue-type mapping TBD).
- **Session thumbnails** — the detail `SessionCard` shows a neutral play surface;
  wire a thumbnail URL if one exists, otherwise the placeholder is intended.

---

## NOT-YET-BACKED — designer features shipped ahead of the backend

The UI is fully built and wired to the **real `client`**, but the endpoints
below don't exist yet. Reads swallow errors and resolve empty; writes are
best-effort no-ops (`silent`/`silentVoid` in `api.ts`). So the features render
and behave locally (optimistic), just don't persist — shipping the backend needs
**no frontend change**. Grep:

```
grep -rn "NOT-YET-BACKED" app/components/SmartAlerts app/mstore/issuesStore.ts
```

### Per-user "critical for me" (three-state critical)
- Triangle is three-state: **none → project (agent) → mine**. Clicking cycles
  only my personal layer (`markMine`/`removeMine`) — never the project flag.
  Removing the project-wide flag (with a teaching reason) lives in the list row
  ellipsis + the detail chip.
- Store: `mine: string[]`, `critState()`, `agentCritical()`, `isRelevant()`,
  `relevantCount`. Hydrated by `getMyCriticals` (stub → `[]`).
- Endpoints needed: `GET …/my-criticals` → `string[]` (issue names);
  `POST …/my-criticals {issue}`; `DELETE …/my-criticals {issue}`.
- "Critical to me" Display checkbox → `relevantToMe` list param (server ignores
  it for now, so the filter is inert until backed).

### Focus (traffic segments the agent concentrates on)
- `FocusButton` (header) + `FocusDrawer` (create/edit, uses the real Sessions
  `<SessionFilters/>` omni-search) + TagFilter "Found in" origins (Full traffic /
  My segments / per-focus) + a per-row origin chip (shown only once focuses exist).
- Store: `focuses: Focus[]`, `origins: IssueOrigin[]`, `activeFocusCount`,
  `focusById`, `toggleFocus`, `saveFocus`, `deleteFocus`, `toggleOrigin`,
  `clearOrigins`. Hydrated by `getFocuses` (stub → `[]`), so the whole subsystem
  is dormant/empty until the backend ships.
- Endpoints needed: `GET/POST …/focuses`, `PUT/DELETE …/focuses/{id}`; the list
  request should honour `origins` (full-traffic + focus ids) and issues should
  carry `focusId` (surfacing focus). `saveFocus` sends the serialized Sessions
  filter `seeds`; `trafficPct`/`sessionsPerDay` are `0` until the backend
  estimates them.

### Notes
- "Critical to me" count = `mine.length` (personal criticals only); segment
  finds aren't included until `focusId`/focuses are backed.
- Focuses created via the drawer are optimistic (in-memory) and vanish on reload
  while `getFocuses` returns `[]`.
