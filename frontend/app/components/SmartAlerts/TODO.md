# Smart Issues — outstanding work

The UI is wired to the Go `/v2/smart-issues` endpoints (client in `api.ts`).
This doc lists **only what's still open** — missing fields, params to confirm,
endpoints not built yet, contract surface we deliberately don't consume,
verification, and open questions.

> **Contract file:** `api2.yaml` is the current one. `api.yaml` is the earlier
> revision — it predates journey-tags, `category`/`categories`,
> `categoryCounts`, `deleted`/`deletedAt` and the search `*Match` params, and
> nothing is written against it. Delete it and rename `api2.yaml` → `api.yaml`;
> both are untracked, so this is a rename, not a migration.

Two things are still faked client-side (grep the markers):

```
grep -rn "MOCK (no endpoint)" app/components/SmartAlerts/api.ts
grep -rn "NOT-YET-BACKED"     app/components/SmartAlerts app/mstore/issuesStore.ts
```

---

## 1. Missing field

| Field | Endpoint | Used for | Fallback today |
|---|---|---|---|
| `suggestedFix` | list / `GET …/issue` (`Issue`) | Player "Suggested fix" section — hidden until present | `fix = ''` in `makeIssue` |

---

## 2. Request params — confirm / wire

| Param | Endpoint | Status |
|---|---|---|
| `critical` | list | sent as `true` only (Critical-only). **Confirm** it matches definition-flagged issues, not just the `critical` label. |
| `relevantToMe` | list | sent but **server-ignored**. See §5.1 — the control is currently inert. |

---

## 3. Endpoints NOT built (still mocked in `api.ts` / `issuesStore.ts`)

### 3.1 Critical definitions — the "critical is a described rule" model (§14)

Criticality is meant to be a set of customer-written descriptions (each with an
author) that the agent matches, per user.

**Backed today:** the per-issue `critical` flag and its feedback. Every place the
user flags or unflags now writes through `PUT` + `{critical}` with `reasons`
(validated against `GET …/reasons`) and a free-text `note` — see
`issuesStore.persistCritical`. The decision and the reasons survive a reload.

**Still missing** — the rule catalogue and per-user attribution:

- `GET/POST/PATCH/DELETE …/critical-definitions`
  → `{ id, description, createdBy: { id, name }, createdAt }` (the description
  *is* the rule; no name field).
- **Per-issue attribution** on every `Issue`: `criticalBy: [{ definitionId, userId }]`
  — which descriptions matched, and whose. **Cannot be recomputed client-side.**
  Drives: why a row is critical, the none/team/mine state, and `relevantToMe`.
- Per-USER suppression. `PUT {critical:false}` is the shared flag, so "not
  critical for me" currently unflags it for the whole team. A per-user route
  (e.g. `POST/DELETE …/issues/:id/not-critical { reason }`) is what makes it
  personal.

Client stand-ins (`issuesStore.ts`): `criticalRules`, `criticalBy`, `notCritical`
+ `matchedRules`/`rulesFor`/`critState`. Server `critical` is treated as one
anonymous "agent" match so flagged issues still read critical. **Impact:** the
Preferences → Agents *critical-rules manager* and the whose-rule-matched reading
of the triangle/chip run on these stand-ins (CRUD resets on reload); the flag
itself does not.

### 3.2 Segment capture — mode + instructions

Per-segment capture flag is already real (`isCapture` on the saved search). Only
these are missing, keyed by saved-search id:

- `GET …/segment-capture` → `{ mode: 'full'|'segments', instructions: Record<segmentId,string> }`
  (per-segment `active` is redundant — read from each saved search's `isCapture`).
- `PUT …/segment-capture { mode }` — project capture mode.
- `PUT …/segment-capture/{segmentId} { instructions }` — per-segment instructions.

**Impact:** the capture-mode switch + per-segment agent instructions are optimistic
and reset on reload.

**Also needed:** a capture-only write. `isCapture` currently persists through
`updateSegment`, which REPLACES the whole saved search, query included — so
`persistCapture` has to re-read the segment and write its own stored query back
just to flip one boolean. A `PATCH` that touches only `isCapture` removes that
read and the clobber risk entirely.

---

## 4. Contract surface we deliberately don't consume

Shipped and documented, but no UI reads it. Listed so it isn't mistaken for a
gap in the backend.

| Field / param | Endpoint | Why not |
|---|---|---|
| `GET …/session/{id}/journey` | journey | **The real gap — see §5.2.** Not a choice. |
| `thumbnailTimestamp` | search | We show the thumbnail, not which moment it is. |
| `issueLabelsMatch` | search | The issue page filters on journey labels only. |
| `segmentsMatch` | list + search | Sent as the `or` default; no AND/OR control in `SegmentFilter`. |
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

### 5.1 "Critical to me" is inert

`relevantToMe` is server-ignored (§2) **and** the client-side `isRelevant` has no
callers, so checking the box refetches an identical list. Either filter locally
with `isRelevant` or disable the control until the attribution in §3.1 lands.

### 5.2 Deep-linked sessions have no journey

`IssuePlayer` reads journey / steps / variation / `issueTimestamp` only from
`card`, found by scanning the `/search` sample. A session outside those rows
leaves `card` undefined → no journey panel, no variation, no seek to the issue
moment. `getSessionJourney` (`api.ts`) exists for exactly this and is not yet
called — wire it as the fallback when `card` is missing.

### 5.3 No Deleted view

`setVisibility` is only ever called with `'active'` / `'hidden'`, so the
`deleted` and `all` list views are unreachable and deletion is one-way in the UI.
Per-row `deleted` / `deletedAt` are already mapped and the row renders a Deleted
tag, so a Deleted view is mostly a visibility control plus re-wiring
`issuesStore.restore`. Not planned for now.

### 5.4 "Full traffic" filter row does nothing

`SegmentFilter` offers it, but `segmentIds` strips the `'full'` sentinel — the
request is identical to no filter. It only makes `hasActiveFilters` true. Needs
either an API param for "found in full traffic only", or the row removed.

### 5.5 Tags created in the filter can't be selected there

`TagFilter`'s "New tag" writes to the journey-tag vocabulary
(`…/journey-tags`), but its options come from `labelsAll.journeyLabels` — labels
actually *applied* to sessions. A new tag can't appear until the agent applies
it. The dialog should say so.

### 5.6 Renaming a tag re-points an active filter at a name with no data

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
- List filters round-trip: `category`, `critical`, `segmentIds` + `segmentsMatch`,
  `journeyLabelsMatch`, visibility; `categoryCounts` present on the response.
- `categoryCounts` really does come back **with a category tab selected** (the
  contract says it's computed with the `category` filter removed). The tab counts
  go stale if it doesn't.
- `/search` honours `segmentIds` + `journeyLabelsMatch`; returns `thumbnail`,
  `journeySteps`, `journeySummary`, `segmentIds`.
- `isCapture` write path (saved-search PUT) persists on reload **and doesn't
  alter the segment's query** (see §3.2).
- `PUT {critical}` accepts the reason strings from `GET …/reasons` and the flag
  survives a refetch.
- `GET …/issue?name=` resolves an off-page issue; `?jumpto=` / `issueTimestamp`
  seeks the player; journey-step click seeks correctly.
- Journey-tags CRUD: create/rename/delete persist; 409 on duplicate name.
- Label `ratio` values are real percentages — the 70 floor in `factories.ts`
  silently empties the Tags column if they aren't.

---

## 8. Open questions

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
