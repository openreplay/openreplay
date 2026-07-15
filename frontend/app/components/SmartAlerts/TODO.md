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

### Traffic segments (agent capture over saved searches)
The old per-Issues "Focus" concept is gone: a segment is now a **Data
Management saved search** (`/sessions/search/saved`) with an agent-capture
layer on top, shared by the Issues pill and the DM Segments list. The saved
search itself is real; only the capture layer is stubbed.

- UI: `segments/SegmentsIndicator` (the Issues title pill — capture-mode switch
  + manage/picker popover), `segments/SegmentDrawer` (shared create/edit
  slide-out, real `<SessionFilters/>` omni-search, used from both Issues and
  DM), `segments/SegmentConditions` (query hover card), plus the DM Segments
  list's "Issues Agent" capture column + creator meta line, TagFilter "Found in"
  origins, and the per-row origin chip (shown once segments exist).
- Store (`issuesStore`): `segments: SavedSegment[]` (real saved searches merged
  with the capture layer), `captureMode`, `origins`, `segmentById`,
  `visibleSegments`, `capturingSegments`, `activeSegmentCount`, `setCaptureMode`,
  `enableCapture`, `toggleSegment`, `saveSegment`, `deleteSegment`. The list is
  real (`fetchSegments` in DataManagement/Segments/api); the capture layer is
  hydrated by `getSegmentCapture` (stub → empty), so capture is dormant until
  the backend ships.

Endpoints needed (under `/v2/smart-issues/{projectId}`, keyed by saved-search id):
- `GET …/segment-capture` → `{ mode: 'full'|'segments', active: string[]
  (segment ids the agent captures), instructions: Record<segmentId, string> }`.
- `PUT …/segment-capture` `{ mode }` — set the project capture mode.
- `PUT …/segment-capture/{segmentId}` `{ active?, instructions? }` — per-segment
  capture flag + agent instructions.
- The issue list request should honour `origins` (full-traffic + segment ids),
  and issues should carry `segmentId` (which segment surfaced them).

Also required on the segment (saved-search) side:
- **Traffic estimate** — `trafficPct` / `sessionsPerDay` per segment. Both are
  `0` today; the DM "Traffic" column and the drawer's estimate banner stay
  hidden/neutral until the backend computes them.
- **Creator name** — `/sessions/search/saved` returns only `userId`. The store
  resolves the name from the members list and falls back to "a teammate" when it
  isn't loaded; returning a creator name/handle on the segment removes that
  fallback.

### Notes
- "Critical to me" count = `mine.length` (personal criticals only); segment
  finds aren't included until `segmentId`/capture are backed.
- Capture toggles, capture mode and instructions persist via stubs (no-ops), so
  they're optimistic and revert on reload until the endpoints ship.
