# Smart Issues — outstanding work

### Readiness `████████░░` 8 / 10

Frontend is feature-complete against api4 — list/detail/player, filters, journey
tags, critical-definitions, deleted view, segment scope + project capture mode
all wired. The missing 2 points are **not UI work**: 3 backend gaps
(`suggestedFix`, per-segment capture *instructions*, per-issue `criticalBy`
storage) plus **zero live-backend verification** — nothing here has run against a
real server yet (see §7).

The UI is wired to the Go `/v2/smart-issues` endpoints (client in `api.ts`).
This doc lists **only what's still open** — missing fields, params to confirm,
endpoints not built yet, contract surface we deliberately don't consume,
verification, and open questions.

> **Contract file:** `api4.yaml` is the current one. `api.yaml` / `api2.yaml` /
> `api3.yaml` are earlier revisions — they predate (in order) the `issueId`
> switch, real `critical-definitions` CRUD, per-caller `PUT {critical}`, and the
> project-settings endpoint. Nothing is written against them. Delete them and
> rename `api4.yaml` → `api.yaml`; all are untracked, so this is a rename.

One thing is still faked client-side (grep the markers):

```
grep -rn "MOCK (no endpoint)" app/components/SmartAlerts/api.ts
grep -rn "NOT-YET-BACKED"     app/components/SmartAlerts app/mstore/issuesStore.ts
```

Only the **per-segment capture instructions** (§3.1) remain mocked; the capture
MODE is now a real project setting, and critical-definitions are real too
(§ "Backend limitation").

---

## 1. Missing field

| Field | Endpoint | Used for | Fallback today |
|---|---|---|---|
| `suggestedFix` | list / `GET …/issue` (`Issue`) | Player "Suggested fix" section — hidden until present | `fix = ''` in `makeIssue` |

---

## 2. Request params — confirm / wire

| Param | Endpoint | Status |
|---|---|---|
| `critical` | list | sent as `true` only (Critical-only). **Confirm** it matches the per-caller verdict / definition-flagged issues, not just the legacy `Critical` label. |

---

## 3. Endpoints NOT built (still mocked in `api.ts` / `issuesStore.ts`)

### 3.1 Segment capture — per-segment instructions

The two project-level pieces are now real:

- **Capture mode** → `GET/PATCH …/settings { captureSegmentsOnly }` (api4). Wired
  through `getSegmentCapture`/`setCaptureMode`; the mode switch persists.
- **Per-segment capture flag** → the saved search's `isCapture`.

Still missing — **per-segment agent instructions** ("extra guidance for the agent
on this segment"). There is no endpoint, so `setSegmentCapture` is a no-op and the
instructions field is optimistic + resets on reload. Needs e.g.
`PUT …/segment-instructions/{segmentId} { instructions }` keyed by saved-search id.

**Also needed:** a capture-only write. `isCapture` currently persists through
`updateSegment`, which REPLACES the whole saved search, query included — so
`persistCapture` has to re-read the segment and write its own stored query back
just to flip one boolean. A `PATCH` that touches only `isCapture` removes that
read and the clobber risk entirely.

---

## Backend limitation — critical attribution isn't stored

The `critical-definitions` CRUD is now real and wired (`listCriticalDefinitions`
/ `create` / `update` / `delete` in `api.ts`; `issuesStore.criticalRules` +
`fetchCriticalDefinitions`). Author-only edit/delete keys off `mine`, matching
the server's 403. Per-caller `PUT {critical}` is real too — marking an issue
(not-)critical for yourself no longer changes a teammate's view, and it survives
a reload.

**The one remaining gap is on the backend:** per api3, the model's critical
verdict is *discarded before storage*, so every `Issue.criticalBy`
(`[{ definitionId, userId }]`) comes back **empty**. The UI already maps and
consumes it (`Issue.criticalBy` → `issuesStore.rulesFor`), so the moment the
backend persists the verdict, the none/team/mine reading of the triangle/chip and
the "Critical to me" count light up with no client change.

Until then, authoring a rule from an issue attaches it **in-session only** (the
local `criticalBy` map) and persists the per-caller `critical` flag; after a
reload the issue still reads critical, but attributed to the anonymous agent
match (`AGENT_RULE`), not to the rule/author — because the server returns no
attribution to rebuild it from.

---

## 4. Contract surface we deliberately don't consume

Shipped and documented, but no UI reads it. Listed so it isn't mistaken for a
gap in the backend.

| Field / param | Endpoint | Why not |
|---|---|---|
| `level` | list / issue | Mapped, rendered nowhere; `critical` already folds it in. |
| `thumbnailTimestamp` | search | We show the thumbnail, not which moment it is. |
| `issueLabelsMatch` | search | The issue page filters on journey labels only. |
| `segmentsMatch` | search (detail scope) | The list has an AND/OR toggle; the detail-page segment scope still sends the `or` default with no control. |
| `sortBy: count \| firstSeen` | list | No column sorts on them. |
| `minCount`, `minImpact` | list | No threshold control; always `0`. |
| `critical: false` | list | Only Critical-only is exposed — see §6. |
| `issueLabels` (as `Issue.tags`) | list | Mapped in `makeIssue`, rendered nowhere; the Tags column shows journey labels. |
| `impactedSessions`, `count`, `deletedAt` | list | Mapped, rendered nowhere. |
| `PUT {restore:true}` | issues | Kept in `api.ts` + `issuesStore.restore`, unwired — see §5.3. |

**Label ratios ARE consumed** — `makeIssue` drops any issue/journey label under
`LABEL_RATIO_MIN` (70), so a label shown against an issue holds for most of its
sessions rather than one variation.

---

## 5. Known gaps in the UI itself

### 5.1 "Critical to me" count is client-derived

`relevantToMe` now round-trips to a real server filter (resolved off the caller's
own persisted `critical` verdict), so the control works. But the **count badge**
(`issuesStore.relevantCount` / `isRelevant`) is derived from in-session
attribution (`critState === 'mine'`), which needs `Issue.criticalBy` to name the
rule's author — empty from the server today (see the backend limitation). So the
badge under-counts (often `0`) even when the server filter would return rows.
Lights up once attribution is stored.

### 5.2 "Full traffic" filter row does nothing

`SegmentFilter` offers it, but `segmentIds` strips the `'full'` sentinel — the
request is identical to no filter. It only makes `hasActiveFilters` true. Needs
either an API param for "found in full traffic only", or the row removed.

### 5.3 Tags created in the filter can't be selected there

`TagFilter`'s "New tag" writes to the journey-tag vocabulary
(`…/journey-tags`), but its options come from `labelsAll.journeyLabels` — labels
actually *applied* to sessions. A new tag can't appear until the agent applies
it. The dialog should say so.

### 5.4 Renaming a tag re-points an active filter at a name with no data

`updateTag` remaps `this.labels` to the new name, but per the contract edits
affect future captures only — already-tagged sessions keep the old name, so the
remapped filter returns nothing. Same for `removeTag` dropping a label that is
still queryable.

---

## 6. Frontend-only to-do (no backend)

- **Create ticket (Jira)** — the detail-page button is UI-only; wire it to the
  ticket integration (project / issue-type mapping TBD).

---

## 7. Verify against a running backend (couldn't here)

- **Base-path routing** — `/v2/smart-issues` routes via the `noChalice` branch in
  `api_client.ts` (like `/kai`). Confirm the resolved URL on **self-hosted**
  (`origin/v2/smart-issues/…`) **and** the SaaS gateway.
- **`issueId` addressing** — every issue call now sends the UUID, not the name:
  `GET …/issue?id=`, `/search { issueId }`, `PUT`/`DELETE { issueId }`. Confirm
  the list rows carry `issueId` and deep-links resolve by it.
- List filters round-trip: `category`, `critical`, `relevantToMe`, `segmentIds` +
  `segmentsMatch` (list AND/OR toggle), `journeyLabelsMatch`, visibility;
  `categoryCounts` present.
- **Deleted view** — the Display popover's Hidden + Deleted toggles map to
  `hidden`/`deleted`/`all`; the `deleted` list returns soft-deleted rows and the
  row-menu **Restore** (`PUT {restore:true}`) brings one back to active.
- **Deep-link fallback** — a session NOT in the issue's `/search` sample still
  renders its journey / steps / variation via `GET …/session/{id}/journey`
  (no issue-moment seek and prev/next disabled for it — expected).
- `categoryCounts` really does come back **with a category tab selected** (the
  contract says it's computed with the `category` filter removed). The tab counts
  go stale if it doesn't.
- `/search` honours `segmentIds` + `journeyLabelsMatch`; returns `thumbnail`,
  `journeySteps`, `journeySummary`, `segmentIds`.
- `isCapture` write path (saved-search PUT) persists on reload **and doesn't
  alter the segment's query** (see §3.1).
- **Capture mode** — the full/segments switch (`SegmentsIndicator`) round-trips to
  `GET/PATCH …/settings { captureSegmentsOnly }` and survives a reload; a project
  with segments defined but `captureSegmentsOnly:false` captures full traffic.
- **`PUT {critical}` is per-caller** — a teammate's view is unchanged, and the
  flag survives a refetch; accepts the reason strings from `GET …/reasons`.
- **Critical-definitions CRUD** — create/edit/delete persist; editing or deleting
  another user's rule returns 403 (the UI already gates on `mine`).
- `?jumpto=` / `issueTimestamp` seeks the player; journey-step click seeks
  correctly.
- Journey-tags CRUD: create/rename/delete persist; 409 on duplicate name.
- Label `ratio` values are real percentages — the 70 floor in `factories.ts`
  silently empties the Tags column if they aren't.

---

## 8. Open questions

- **Per-issue `criticalBy` — when does it get stored?** api3 flags it as a known
  limitation (verdict discarded before storage). Everything downstream in the UI
  (none/team/mine, "Critical to me" count) is wired and waiting on it. Any ETA?
- **Non-critical filter control?** The `critical` param supports tri-state
  (`false` = only non-critical), but the UI exposes only Critical-only. Add a
  third state, or leave it?
- **Label ratio floor.** 70 is a first pass. Tune once real data is in front of
  it — `LABEL_RATIO_MIN` in `factories.ts`.
- **Agents Preferences ownership at merge.** The panel is ported here
  merge-compatible with kai-testing-ui (its `index.tsx` mirrors that branch's
  chrome; only the tab list differs). Confirm which branch owns the shared
  `index.tsx` + `confirms` so we repoint the one import cleanly. NB: `index.tsx`
  now also calls `issuesStore.ensureJourneyTags` — keep that on merge.
