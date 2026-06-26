# AI Issues (SmartAlerts) — remaining work

Status of the redesign wired to the **real** `/kai` smart-alerts endpoints. The UI
is structurally complete and degrades gracefully where data is missing.

All backend gaps are tagged in code with `/* WAITING BACKEND */`. To find them:

```
grep -rn "WAITING BACKEND" app/components/SmartAlerts
```

Backend→view-model mapping lives in **`factories.ts`** (`makeIssue`,
`makeIssueSessionCard`) — that is the single place to update once new fields land.

---

## 1. Backend — data contract gaps

The endpoints return less than the redesign shows. Each field below is currently
defaulted in `factories.ts` and the UI hides the corresponding element until real
data arrives.

### `GET/POST /kai/:projectId/smart_alerts` (issues list) → `makeIssue`
| Field we need | Default now | UI effect while missing |
|---|---|---|
| `category` (`Errors` \| `UI/UX` \| `Slowness`) | **derived locally** in `makeIssue` from the per-label ratios | `cat` (column/avatar) = dominant (highest-ratio) label. `categories` (tab filter + counts) = every category label with **ratio > 25** (`CATEGORY_RATIO_MIN`), so an issue can sit in several tabs. Selecting a tab additionally requires issue **impact > 25** (`CATEGORY_IMPACT_MIN`). Both are local rules — replace with server-provided per-issue categories when available. |
| `description` (issue-level problem text) | `real = ''` | "The problem" block hidden on detail; "The problem" tab shows placeholder in player |
| `suggestedFix` | `fix = ''` | "Suggested fix" tab shows "No suggestion yet." |
| `lastSeen` (timestamp or minutes-ago) | `seenAgoMin = null` | "Last seen" column hidden; "Newest" sort inert |
| stable `id` | using `issueName` (slugified) as the id | relies on a unique slug; breaks if two names slugify alike or a name changes; see §2 |

### `POST /kai/:projectId/smart_alerts/search` (example sessions) → `makeIssueSessionCard`
| Field we need | Default now | Notes |
|---|---|---|
| short per-session `variation` headline | falls back to `description` → `journey` → `''` | redesign wants a 1-line headline distinct from the longer journey |
| reliable `metadata.plan` | `plan = ''` if absent | plan chip hidden when empty |

> Mapping assumes the raw session JSON keeps the legacy field names
> (`userId`, `userBrowser`, `userOs`, `userDeviceType`, `userCountry`, `userCity`,
> `duration`, `startTs`, `eventsCount`, `metadata`). **Verify these names** — if they
> changed, update `RawIssueSession` in `api.ts` + `makeIssueSessionCard`.

---

## 2. Backend — missing mutations (currently client-side only)

These work in the current session but **do not persist** across reload:

- **Critical flag set/unset** — no endpoint. Derived from the presence of a
  `critical` label; toggling is an in-memory override (`issuesStore.criticalOverride`).
  The "why is this not critical?" reasons are collected but **not sent anywhere**.
  Need: an endpoint to set/clear critical + store the reason.
- **Un-hide** — `hideIssue` (`PUT … operation:{hide:true}`) is permanent; there is
  no un-hide operation. The "Show hidden / Unhide" controls are session-only.
- **Stable issue id** — see §1. Prefer a real id + a `getIssueById` so detail/player
  deep-links survive renames and don't rely on encoding `issueName` into the URL.

`rename` and `hide` **do** call the backend (`PUT …/smart_alerts`) and then update
optimistically — confirm the response shape is what we assume.

---

## 3. Frontend — your side

- **Create ticket (Jira)** — the button on the detail page is UI-only. Wire it to
  the Jira/ticket integration (and decide project/issue-type mapping).
- **Session thumbnails** — the detail `SessionCard` shows a neutral play surface
  (no preview image is available outside the player). Wire a thumbnail URL if one
  exists; otherwise the placeholder is the intended look.
- **List date range** — presentational only; `getIssues` is not range-scoped. Either
  add a `range` param to the issues endpoint or remove the picker.
- **i18n** — the redesign uses literal strings (lint emits `i18next/no-literal-string`
  warnings). Wrap in `t()` if these surfaces must be localized.
- **Move to saas repo** — these three routes live in `app/saasComponents.tsx`
  (`saasRoutes` + `extraMenuItems`). When you split them out, move
  `app/components/SmartAlerts/`, `app/mstore/issuesStore.ts`, and the
  `MENU.ISSUES` entry with them.

---

## 4. Verify in a running app (couldn't, no backend here)

- [ ] `IssuePlayer` actually plays a real session and `?jumpto=` / `issueTimestamp`
      seek lands on the issue moment. Bootstrap is ported from `WebPlayer.tsx` but
      renders `PlayerContent` standalone — confirm DOM/css load + autoplay behave.
- [ ] The `fixed inset-0` player overlay sits correctly over the app shell and the
      antd popovers (Share/More/critical reason) render above it.
- [ ] Activity tab shows the **real** session events; Console/Network/X-Ray come
      from the session replay (not Spot).
- [ ] `getIssueSessions` response field names match `RawIssueSession` (see §1 note).
- [ ] Empty/degraded states look right against real data (no category, no
      problem/fix text, no last-seen).
