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

- **Category tab** → sent as `issueLabels` (single category), `issueLabelsMatch: 'and'`.
- **Critical only** → dedicated `critical: true` request flag (real param), not a
  label. Covers override-critical issues too.
- **Journey labels** → `journeyLabels` with `journeyLabelsMatch = AND/OR` (the
  match toggle) — separate from `issueLabelsMatch`.
- **Segments ("Found in")** → real `segmentIds: string[]` on the list (and on
  `/search` for the detail example-sessions scope). `[]` / omitted = full traffic.
- **`relevantToMe`** (Critical-to-me checkbox) is still sent but **server-ignored**
  — see § MOCKS (personal criticals aren't backed).
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

## MOCKS — routes that DO NOT EXIST server-side

The UI is fully built, but two route groups were **never shipped** and are
**mocked in `api.ts`** — they do NOT call the network (no 404s), they resolve a
default / no-op. Features behave optimistically in-session via the store but
**do not persist across reload**. Swap each mock body for a real `client.*`
call when the backend ships — no other frontend change needed. Grep:

```
grep -rn "MOCK (no endpoint)" app/components/SmartAlerts/api.ts
grep -rn "NOT-YET-BACKED"     app/components/SmartAlerts app/mstore/issuesStore.ts
```

| Route (does not exist) | Mock in `api.ts` | Effect |
|---|---|---|
| `GET/POST/DELETE …/my-criticals` | `getMyCriticals`→`[]`, `addMyCritical`/`removeMyCritical`→no-op | "critical for me" (store `mine`) resets on reload |
| `GET/PUT …/segment-capture`, `PUT …/segment-capture/{id}` | `getSegmentCapture`→`{mode:'full',…}`, `setCaptureMode`/`setSegmentCapture`→no-op | capture **mode** (full/segments) + per-segment **instructions** reset on reload |

**Real, not mocked** (don't confuse with the above): the per-segment capture
flag "Identify issues in this segment" persists as **`isCapture`** on the saved
search (`createSegment`/`updateSegment`), and `segmentIds` filtering on the list
+ `/search`. Only capture *mode*, *instructions* and *my-criticals* are unbacked.

### Per-user "critical for me" (three-state critical)
- Triangle is three-state: **none → project (agent) → mine**. Clicking cycles
  only my personal layer (`markMine`/`removeMine`) — never the project flag.
  Removing the project-wide flag (with a teaching reason) lives in the list row
  ellipsis + the detail chip.
- Store: `mine: string[]`, `critState()`, `agentCritical()`, `isRelevant()`,
  `relevantCount`. Hydrated by `getMyCriticals` — **MOCK → `[]`** (no endpoint),
  so `mine` is in-session only.
- Endpoints needed (DO NOT EXIST): `GET …/my-criticals` → `string[]` (issue
  names); `POST …/my-criticals {issue}`; `DELETE …/my-criticals {issue}`.
- "Critical to me" Display checkbox → `relevantToMe` list param (server ignores
  it for now, so the filter is inert until backed).

### Traffic segments (agent capture over saved searches)
The old per-Issues "Focus" concept is gone: a segment is now a **Data
Management saved search** (`/sessions/search/saved`) with an agent-capture
layer on top, shared by the Issues pill and the DM Segments list. The saved
search itself is real, and the per-segment capture flag persists as `isCapture`
on it; only the capture **mode** + per-segment **instructions** are MOCK.

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
  real (`fetchSegments` in DataManagement/Segments/api). Per-segment capture
  persists via `isCapture` (real). `getSegmentCapture` is **MOCK → empty**, so
  capture **mode** + **instructions** are in-session only.

Endpoints needed — capture MODE + INSTRUCTIONS (these routes DO NOT EXIST; mocked
in `api.ts`, keyed by saved-search id):
- `GET …/segment-capture` → `{ mode: 'full'|'segments', instructions:
  Record<segmentId, string> }` (per-segment `active` is redundant — read it from
  each saved search's `isCapture`).
- `PUT …/segment-capture` `{ mode }` — set the project capture mode.
- `PUT …/segment-capture/{segmentId}` `{ instructions? }` — per-segment agent
  instructions.

Real, already wired: issues carry `segmentId` (surfacing segment); the list +
`/search` honour `segmentIds`; per-segment capture flag is `isCapture` on the
saved search.

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
- Capture mode + instructions persist via MOCK no-ops (capture flag itself is
  real via `isCapture`), so
  they're optimistic and revert on reload until the endpoints ship.
