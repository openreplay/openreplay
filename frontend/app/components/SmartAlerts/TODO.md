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
