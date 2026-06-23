# AI Issues redesign — engineering handoff

A working prototype of the redesigned **AI Issues** surface, built **inside the real frontend**
(this branch is a fork of OpenReplay `main`). It was built **reuse-first** — it leans on existing
OpenReplay components, so most of the work is wiring real data, not rebuilding UI.

- **Live demo:** https://openreplay-issues-demo.vercel.app/1/issues  *(mock data, no backend)*
- **Run locally:** `MOCK=1 yarn dev` → http://localhost:3333/1/issues
  - Plain `yarn dev` boots the real app → login screen → dead without a backend. The `MOCK=1`
    flag triggers `app/dev/mockBootstrap.ts` (gated in `app/initialize.tsx`) which seeds a fake
    user + project so the pages render with no backend.
- **Demo flow:** Issues list → click an issue → click a session card → replay.

## Three surfaces
| Surface | Route | Entry file |
|---|---|---|
| Issues list | `/1/issues` | `app/components/Issues/IssuesList.tsx` |
| Issue detail | `/1/issues/:issueId` | `IssueDetail.tsx` (+ `ProblemCard.tsx`) |
| Replay | `/1/issue-session/:sessionId` | `IssueSessionPlayer.tsx` |

Plus the **email digests** (separate static HTML — see bottom).

## What to KEEP — reuses real OpenReplay components (lift & wire)
- `IssuesList.tsx` — antd `Table`; category tabs mirror Sessions' `Segmented`; critical toggle
  styled by `.critical-toggle` / `.critical-on` in `issues.css`; `ImpactGauge`.
- `ProblemCard.tsx` — the shared building blocks: `CategoryLabel` (teal avatar = `bg-tealx-lightest`
  + `tealx` icon), `ImpactGauge` (horizontal 3-segment), `CriticalControl`, `ReasonChip`, `AiSummary`.
- `IssueDetail.tsx` — `ProblemCard` + Spots `GridItem`-style session cards + `SessionInfoItem` / `SessionMetaList`.
- Replay header / Activity / slide-out reuse: `Components/Session/Tabs` (segmented),
  `Session_/EventsBlock/EventGroupWrapper`, `Session_/Highlight/HighlightButton`,
  `shared/SharePopup/SessionCopyLink`, `shared/AutoplayToggle` CSS, `SessionInfoItem`, `SessionMetaList`.

## What to DISCARD — mock scaffolding, do NOT ship
- `app/dev/mockBootstrap.ts` + `app/dev/mockSessions.ts` — fake user/project/session seed. Remove
  the `MOCK === '1'` gate in `app/initialize.tsx`.
- `app/mstore/issuesStore.ts` — replace the in-memory data (`ISSUES`, `ISSUE_SESSION_IDS`,
  `ISSUE_FIX`, `getMockSessionById` usage) with real API calls. **Keep** the types + helpers
  (`impactLevel`, `IMPACT_COLOR/FILLED`, `CAT_ICON`, category constants, `CRITICAL_REASONS`, `HIDE_REASONS`).
- `app/components/Issues/mockSessionData.ts`, `mockThumb.ts`, `sessionVideo.ts`, `sessionReplay.webm` — demo media.

## ⚠ Replay page — read before implementing
`IssueSessionPlayer.tsx` is built on the **Spot player** (`spotPlayerStore`, `SpotVideoContainer`,
`SpotTimeline`, `SpotPlayerControls`, `SpotLocation`, `SpotConsole`/`SpotNetwork`/overview) as a
**stand-in**, because the real session player needs backend session data the prototype doesn't have.
For production:
- Render the **real session-replay player**, and hang the redesigned pieces on it: the timeline
  issue indicator (band + marker), the **Activity** panel, and the **Issue slide-out**.
- **Dev tools (Console / Network / X-Ray) must come from session replay**, not Spot (Mehdi:
  "the developer tools should be picked from the session replay… you have a lot missing there").
- The **on-video overlay** (WHERE on screen the issue happened) is deferred — needs detection
  coordinates from the backend.
- The header / Activity / slide-out **structure + styling are the spec**; re-point them at the real player.

## Data contract (what the API must return)
- **Issue:** `{ id, head, cat: 'Errors'|'UI/UX'|'Slowness', critical, real (problem text),
  fix (suggested fix), impact (0–100 → ≥45 High, ≥25 Medium, else Low), seenAgoMin, tags[], sessionIds[] }`.
- **Per example session (`IssueSessionCard`):** `{ sessionId, variation (this session's headline),
  journey, tags[] }` + standard session meta (`email, browser, os, country, device, duration, events, plan`).
- Each session represents **one issue's variation**; multiple distinct issues in a session are split
  into separate issues (per Mehdi), not merged.

## Email digests (separate workstream)
`../../email-digests/v2/daily-light.html` + `weekly-light.html` — standalone HTML templates
(illustrative data) that are the spec for the digest emails. Rules applied: no percentages; weekly
has **no "Resolved" metric** (the concept doesn't exist); per-category **count + trend** with a
"staying the same" example; teal category avatars; the **impact gauge + critical indicator match the
app exactly**; daily uses a blue "Open issue" button, outline critical triangle, critical-on-the-left.
