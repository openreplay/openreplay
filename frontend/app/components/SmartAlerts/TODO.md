# Smart Issues — UI ↔ API gaps (for the backend team)

The Smart Issues UI is wired to the Go `/v2/smart-issues` endpoints (contract in
`api.yaml`, client in `api.ts`). Filtering, sorting and pagination are
server-side; mutations persist then refetch.

This doc lists **everything the UI needs that the API does not provide yet** —
missing fields, unhonoured params, and endpoints that don't exist (currently
mocked client-side so the UI works in-session but does not persist). Grep the
code for the markers:

```
grep -rn "WAITING BACKEND"   app/components/SmartAlerts        # defaulted fields
grep -rn "MOCK (no endpoint)" app/components/SmartAlerts/api.ts # fake endpoints
grep -rn "NOT-YET-BACKED"    app/components/SmartAlerts app/mstore/issuesStore.ts
```

Backend → view-model mapping is centralised in `factories.ts` (`makeIssue`,
`makeIssueSessionCard`) — the one place to update when fields land.

---

## A. Missing fields on existing endpoints

`POST /smart-issues/{projectId}` (list) and `GET …/issue` return an `Issue`.
The UI needs these fields added:

| Field | Type | Used for | Fallback today |
|---|---|---|---|
| `suggestedFix` | string | Player "Suggested fix" section (hidden until present) | `''` |
| `category` | `'Errors' \| 'UI/UX' \| 'Slowness'` (+ optional multi) | Category avatar/column + tab filter | **derived client-side** from `issueLabels` ratios in `factories.ts` — replace with a server value |
| `hidden` / `deleted` | boolean per row | Row "Hidden"/"Deleted" tags when `visibility='all'` | inferred from the active `visibility` filter, so tags only show under a single-visibility view |

`POST …/search` (example sessions) → `SearchResultItem`:

| Field | Type | Used for | Fallback today |
|---|---|---|---|
| `variation` | string (short, 1 line) | Session-card headline, distinct from the longer `journey` | falls back to `description` → `journey` |
| `metadata.plan` | string | Plan chip on the card | hidden when absent |

Already provided (no action): `critical`, `impact`, `impactedSessions`, `count`,
`firstSeen`, `lastSeen`, `issueDescription` (GET …/issue), `segmentId`.

---

## B. Request params the server should honour

Sent by the UI today; confirm/implement server-side:

| Param | Endpoint | Status |
|---|---|---|
| `critical: boolean` | list | confirm it covers issues made critical via a definition, not only a label |
| `segmentIds: string[]` | list **and** `/search` | scope to saved-search segments; `[]`/omitted = full traffic |
| `journeyLabelsMatch: 'and'\|'or'` | `/search` | mirror the list's param on the sessions search |
| `relevantToMe: boolean` | list | **ignored today** — needs the critical attribution in §C.1 (filter to issues flagged by the current user's own descriptions) |

**Category tab counts** — the tabs render without counts. A count needs either a
`categoryCounts` map on the list response, or a counts-by-category endpoint. (We
refuse to fan out N `limit:1` requests per filter change.)

---

## C. Endpoints that DO NOT EXIST (implement these)

All mocked in `api.ts` / `issuesStore.ts` — the UI is fully built and will work
with **no frontend change** once these ship.

### C.1 Critical definitions (the "critical is a described rule" model, §14)

Criticality is no longer a per-issue flag. The customer writes descriptions of
what "critical" means (each with an author); the agent flags issues that match,
per user. The UI derives everything from that attribution.

- `GET/POST/PATCH/DELETE …/critical-definitions`
  → `{ id, description, createdBy: { id, name }, createdAt }`.
  (No name field on the rule — the description *is* the rule.)
- **Per-issue attribution** on every `Issue`: `criticalBy: [{ definitionId, userId }]`
  — which descriptions matched, and whose. **Cannot be recomputed client-side**;
  the UI needs it to (a) show *why* a row is critical, (b) power the three states
  none/team/mine, (c) filter "Critical to me" (`relevantToMe`, §B).
- `POST …/issues/:id/not-critical { reason }` — **per-user** suppression + the
  reason as agent feedback (never changes a teammate's view). Plus a way to
  reverse it (e.g. `DELETE …/issues/:id/not-critical`).

Client stand-ins today (in `issuesStore.ts`): `criticalRules`, `criticalBy`,
`notCritical`, and the derivations `matchedRules`/`rulesFor`/`critState`
(`none`|`team`|`mine`). The server `critical` boolean is currently treated as one
anonymous "agent" match so flagged issues still read critical.

### C.2 Journey tags (CRUD)

Journey tags are LLM-matched descriptions applied to sessions. The manager +
the "New tag" flow need:

- `GET/POST/PATCH/DELETE …/journey-tags` → `{ name, description, source }`
  (`source` = predefined vs custom, provenance only — predefined tags are still
  renamable/removable). Name must be unique (the UI surfaces a "name taken"
  error). New/edited tags apply to sessions captured from then on.

Client stand-ins: `predefinedTags`, `customTags`, `addCustomTag`/`updateTag`/
`removeTag`, seeded from `PREDEFINED_JOURNEY_TAGS`.

### C.3 Segment capture (mode + instructions)

The per-segment capture flag itself is **already real** — it persists as
`isCapture` on the saved search (`/sessions/search/saved`, via `createSegment`/
`updateSegment`). Only these two are missing, keyed by saved-search id:

- `GET …/segment-capture` → `{ mode: 'full'|'segments', instructions: Record<segmentId, string> }`
  (per-segment `active` is redundant — read it from each saved search's `isCapture`).
- `PUT …/segment-capture { mode }` — project capture mode.
- `PUT …/segment-capture/{segmentId} { instructions }` — per-segment agent instructions.

---

## D. Saved-search (segment) additions

Segments are Data Management saved searches (`/sessions/search/saved`) reused by
Issues. `isCapture` + `totalSessionCount` already added. Still needed:

- **Traffic estimate**: `trafficPct` and/or `sessionsPerDay` per segment — the DM
  "Traffic" column + the drawer estimate banner stay neutral until these exist
  (`0` today).
- **Creator name**: the payload returns only `userId`; the store resolves the
  name from the members list and falls back to "a teammate" when it isn't
  loaded. Returning a creator name/handle removes that fallback.

---

## E. Verify against a running backend (couldn't here)

- **Base-path routing** — `/v2/smart-issues` is routed via the `noChalice` branch
  in `api_client.ts` (like `/kai`). Confirm the resolved URL on **both**
  self-hosted (`origin/v2/smart-issues/…`) and the SaaS gateway.
- `critical` / `segmentIds` filters + `journeyLabelsMatch` on `/search` round-trip.
- `isCapture` write path (saved-search PUT carries it) persists on reload.
- `GET …/issue?name=` deep-link resolves issues off the current page.
- `?jumpto=` / `issueTimestamp` seeks the player to the issue moment.

---

## F. Frontend-only follow-ups (no backend needed)

- **Create ticket (Jira)** — detail-page button is UI-only; wire to the ticket
  integration (project/issue-type mapping TBD).
- **Session thumbnails** — the detail card shows a neutral play surface; wire a
  thumbnail URL if one exists (otherwise the placeholder is intended).

---

## G. Agents Preferences panel (ported; merge-compatible with kai-testing-ui)

The **Agents Preferences** page (`Client/AgentsPreferences/`) is now on this
branch with the **Issues** tab — the journey-tag manager (`JourneyTags`) + the
critical-rules manager (`CriticalRules`), both wired to the store model in §C.
Route: Preferences → **Agents** (`/client/agents`), gated behind the same
`__test_agents__` flag as the rest of the Agents section (menu + Smart Issues
routes).

Kept deliberately merge-compatible with **kai-testing-ui** (which owns the shared
panel + Tests tab): `index.tsx` copies that branch's chrome/helpers verbatim and
differs only in the tab list (`AGENTS = ['issues']`) and panel content, so the
two merge to one page with `['issues','tests','audits']`. `CriticalRules`/
`JourneyTags` are new files (no conflict). `confirms.tsx` is a local Issues-side
subset of kai-testing-ui's `KaiSettings/.../confirms` — repoint the import at the
shared one on merge if the teams consolidate.

All of it is **client-side only** until §C.1 (critical-definitions) and §C.2
(journey-tags) endpoints ship — CRUD persists in the store, resets on reload.
