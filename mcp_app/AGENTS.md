# OpenReplay MCP App — Agent Guide

Reference: https://modelcontextprotocol.github.io/ext-apps/api/documents/Patterns.html

---

## Project Structure

```
server.ts                    MCP server entry point (stdio transport)
lib/
  tools.ts                   All tool registrations (UI + internal + agent)
  api.ts                     OpenReplay REST API client functions
  agents.ts                  Smart Issues / Smart Tests API calls + compaction for the model
  state.ts                   In-memory state (auth, projects, filter cache, mob-URL allowlist)
  schemas.ts                 Zod validation schemas for tool inputs
  version.ts                 APP_VERSION, read from package.json at runtime
  countries.ts               Country name <-> ISO code resolver
  countriesList.ts           Raw country code -> name map (data only)
scripts/
  typecheck.mjs              tsc wrapper that ignores ../player's pre-existing errors
src/
  App.tsx                    Main React component (view router)
  vite-env.d.ts              Declares __APP_VERSION__ (injected by vite define)
  hooks/useOpenReplayApp.ts  State management + tool result dispatcher
  components/
    ChartView.tsx            ECharts timeseries line chart
    SankeyView.tsx           ECharts Sankey / user journey diagram
    TableChartView.tsx       Pure CSS ranked bar list (top X)
    WebVitalsView.tsx        Pure CSS vitals cards + percentile table
    FunnelView.tsx           Pure CSS step-by-step conversion bars
    SessionList.tsx          Session list with play buttons
    SessionReplayView.tsx    Interactive session replay player
    AuthOverlay.tsx          Browser-login overlay (URL only)
    IdleView.tsx             Empty state placeholder
    chart.schema             API reference for /cards/try endpoint
  player/
    ReplayEngine.ts          Playback loop, per-tab DOM routing, CSS proxy
    fetchAndParseMobFiles.ts Fetch (via server proxy) + decrypt + parse mob files
  styles/
    index.css                Stylesheet imports
    base.css                 Base HTML element and layout styles
    theme.css                CSS custom properties (--or-*) + dark mode
    forms.css                Form element styling
    charts.css               Shared view classes + chart-specific CSS
    session-list.css         Session list layout
    replay.css               Session replay player layout + controls
    utilities.css            Utility classes
  utils/
    debugger.ts              Host logging helper via app.sendLog
    formatDate.ts            Date-range label formatting
    countries.ts             Country code -> display name (UI side)
```

Everything else the replay needs — `Screen`, `PagesManager`, `DOMManager`, `VirtualDOM`,
`MobFileParser`, `MFileReader`, `rewriteMessage`, `messageOrder`, `unpack`, `crypto` —
comes from the **`@openreplay/player` package** (`../player`, a `link:` dependency, so
`node_modules/@openreplay/player` is a symlink to live source, never a stale copy).
Vite resolves it through the `resolve.alias` in `vite.config.ts`; `tsc` through `paths`
in `tsconfig.json`. Do not vendor copies of those files into this app — a fork silently
drifts from the player (new message types, ordering fixes) and breaks replay.

### Build

Vite builds the React app into a **single HTML file** (`dist/index.html`) via `vite-plugin-singlefile`. The server reads this file and serves it as a `ui://` resource. No separate asset hosting needed.

Run: `npm run build` — typecheck, then Vite (UI), then esbuild (server bundle).
Type check only: `npm run typecheck`.

`npm run typecheck` wraps `tsc --noEmit` via `scripts/typecheck.mjs`. `tsc` follows
imports into `../player/src` and reports that package's ~35 pre-existing type errors;
the wrapper drops diagnostics anchored outside this directory and fails on anything in
mcp_app's own files. Run bare `npx tsc --noEmit` if you want to see the player's too.

---

## Data Flow

1. **Model calls a tool** -> `server.ts` routes to handler in `lib/tools.ts`
2. **Tool handler** calls API functions from `lib/api.ts`, returns JSON as `text` content
3. **Host renders UI** -> React app receives the result via `ontoolresult` callback
4. **`useOpenReplayApp.handleToolResult`** parses `data.type` and routes to the right view:
   - `"session_list"` -> SessionList
   - `"chart"` -> ChartView
   - `"user_journey"` -> SankeyView
   - `"web_vitals"` -> WebVitalsView
   - `"table_chart"` -> TableChartView
   - `"funnel"` -> FunnelView
   - `"session_replay"` -> SessionReplayView
   - `"error"` with `isAuthError: true` -> AuthOverlay

---

## Tools

### UI Tools (`registerAppTool`)

Registered with `registerAppTool()`. The host renders the React app alongside the tool result. All share the same `resourceUri` (`ui://openreplay/app`). Each returns JSON with a `type` field the React app uses to pick the view.

| Tool | View | Purpose |
|------|------|---------|
| `view_recent_sessions` | SessionList | Session list with user info, timing, play buttons |
| `view_chart` | ChartView | Timeseries line chart (sessions over time) |
| `view_user_journey` | SankeyView | Sankey flow diagram (page navigation paths) |
| `view_web_vitals` | WebVitalsView | Core Web Vitals cards (LCP, CLS, TTFB, etc.) |
| `view_table_chart` | TableChartView | Ranked bar chart (top pages, browsers, countries...) |
| `view_funnel` | FunnelView | Step-by-step conversion funnel |
| `view_session_replay` | SessionReplayView | Interactive session replay with DOM reconstruction |

### Internal Tools (`server.registerTool`)

No UI — return plain text/JSON to the model.

| Tool | Purpose |
|------|---------|
| `configure_backend` | Set backend URL (self-hosted) |
| `login_browser` | Browser-based login (recommended); returns authorize URL |
| `complete_login` | Finalize browser login by polling for approval |
| `login_jwt` | JWT token auth (persisted to disk) |
| `logout` | Clear auth and remove persisted token |
| `get_auth_status` | Check auth state |
| `list_projects` | Fetch all projects (caches in state) |
| `fetch_chart_data` | Generic API proxy |
| `get_session_details` | Session replay metadata + events |
| `get_available_filters` | Filter catalog for a project (events, event properties, attributes, segments, features) |
| `fetch_events` / `fetch_users` | Data-management queries |
| `search_docs` | Search the OpenReplay docs index |

### Agent Tools (`registerAgentTools`, plain `server.registerTool`)

Smart Issues and Smart Tests — the UI's "Agents" section. No view: they return compact JSON
and the model formats it. The frontend clients are the contract
(`frontend/app/components/SmartAlerts/api.ts`, `frontend/app/components/Client/SmartTests/api.ts`).

| Tool | Purpose |
|------|---------|
| `list_smart_issues` / `get_smart_issue` | Issue list; one issue + example sessions (`/search`) |
| `list_smart_tests` / `get_smart_test` | Test list; one test + recent runs |
| `list_smart_test_runs` / `get_smart_test_run` | Run list; one run's step results from the runner's `results.json` |
| `trigger_smart_test_run` | The only write. Runs against the live site, so it's described as user-initiated only |

`lib/agents.ts` trims every response to what the model needs: environment `variables` are
never returned (they hold the runner's login credentials and headers), runner text is clipped,
labels below the UI's 70% ratio floor are dropped. `GET /tests/{id}` stamps the test's
write-once `seenAt`, so `get_smart_test` clears the UI's "new" badge, same as opening it there.

App-only tools (`registerAppTool` with `visibility: ["app"]`, hidden from the model):

| Tool | Purpose |
|------|---------|
| `_refresh_replay_urls` | Re-fetch signed mob file URLs + fileKey when they expire |
| `_fetch_mob_file` | Fetch a mob file by URL, return base64. Only fetches URLs this server minted (see `allowMobUrls`), capped at 128 MB |
| `_fetch_css` | Fetch an external stylesheet for the replay iframe, return base64. Stricter guard — these URLs come from the recorded page (see `assertProxyableCssUrl`), capped at 5 MB |

Don't add tools that overlap an existing one: every definition ships in each conversation's
context. `fetch_sessions`, `get_project_id`, `get_session_replay` and `fetch_event_definitions`
were removed for that reason — `view_recent_sessions` already returns compact session JSON,
every tool resolves `projectName`, sessions carry `replayUrl`, and `get_available_filters`
reads the same catalog.

### Tool Visibility (MCP Apps extension)

Only applies to `registerAppTool`. Set in `_meta.ui.visibility`:

| Value | Meaning |
|-------|---------|
| `["model"]` | AI model can call, React app cannot via `callServerTool()` |
| `["app"]` | React app can call via `callServerTool()`, hidden from model |
| `["model", "app"]` | Both (default if omitted) |

The UI tools use `["model"]`, except `view_session_replay`, which is `["model", "app"]` because
the session list's play button calls it. The three `_` tools are `["app"]`. The app also calls
`configure_backend`, `login_browser` and `complete_login`, which are plain `server.registerTool`
tools and therefore default to both. A host that enforces visibility rejects an app call to a
`["model"]` tool, so check this whenever the UI starts calling a new tool.

`server.registerTool` does NOT support the visibility feature. It's an MCP Apps extension only for `registerAppTool`.

Input schemas live in `lib/schemas.ts` and are passed to registration as-is; handlers get the
parsed args (defaults applied) and must not re-parse. Keep descriptions short — the filter
grammar is described once, in `get_available_filters`.

Both take `inputSchema: z.object({...})` (MCP SDK v2). The raw-shape form `inputSchema: {...}` is
deprecated in v2 and loses handler result typing (`type: "text"` widens to `string`). Tools with no
`inputSchema` get the request context as their first callback argument, not the tool args.

### Tool Description Steering

Tool descriptions double as instructions for the AI model:

```typescript
// PREFERRED: model should always pick this for session viewing
description: "PREFERRED tool for fetching and displaying sessions. Always use this tool when..."

// Demoted: model should only pick this in specific cases
description: "Internal tool: ... Only use this when..."
```

All UI tools include a TIP in their description guiding the model to use `view_recent_sessions` with the same filters for session drill-down.

---

## OpenReplay API

### Base URL

Default: the persisted URL, else `https://app.openreplay.com`, overridden by the `OPENREPLAY_URL`
env var (set by the host from `user_config.app_url` in `manifest.json`) or the `configure_backend`
tool. The manifest has no `default` for `app_url` on purpose: a default makes the env always set,
so every reinstall (which wipes user_config) would reset the instance and drop the JWT.
Env wins over the persisted value on every launch; if they disagree the stored JWT is
dropped, since it was minted against a different instance.

One URL only — the address the user types in their browser. `buildApiUrl` derives the API
host from it: `app.openreplay.com` -> `api.openreplay.com` with the `/api` path segment
stripped, anything else -> `<host>/api`. It rejects endpoints that aren't a plain `/path` and
checks the final host, since the JWT goes wherever the URL points (`fetch_chart_data` takes
the endpoint from the model).

Switching instance (`configure_backend` only — `login_browser` takes no URL, so the model
can't silently swap the configured instance while logging in) goes through
`setAppUrl`, which drops the JWT and the project/filter caches — a token is only valid
for the instance that minted it.

### Authentication

All API calls require `Authorization: Bearer <jwt>`. The JWT is stored in `state.jwt` and persisted to `~/.openreplay-mcp/config.json`.

Error convention: if `state.jwt` is null, throw `"AUTH_ERROR: Not authenticated"`. The React app detects `isAuthError` in the response and shows the auth overlay.

### Endpoints

| Pattern | Method | Purpose |
|---------|--------|---------|
| `/api/projects` | GET | List projects |
| `/v2/api/{siteId}/sessions/search` | POST | Search/list sessions |
| `/v2/api/{siteId}/sessions/{sessionId}/replay` | GET | Session replay metadata + mob file URLs |
| `/v2/api/{siteId}/sessions/{sessionId}/events` | GET | Session events |
| `/v2/api/{siteId}/cards/try` | POST | All analytics (charts, journeys, vitals, tables, funnels) |
| `/v2/api/{siteId}/filters` | GET | Filter catalog: object keyed by category (`events`, `event`, `session`, `user`, `users`, `metadata`, `segments`, `features`), each `{total, displayName, scope, list}` |
| `/v2/api/{siteId}/events` | POST | Data-management event feed |
| `/v2/api/{siteId}/users` | POST | Data-management user list |
| `/v2/smart-issues/{siteId}[/issue,/search]` | POST/GET | Smart Issues (responses wrapped in `data`) |
| `/v2/api/{siteId}/browser-tests/{tests,runs,environments}` | GET/POST | Smart Tests (responses **not** wrapped in `data`) |

Pass endpoints with their full self-hosted prefix (`/v2/api/...` or `/api/...`).
`/v2/smart-issues/...` is the exception: it lives at the origin root on both shapes
(`api.openreplay.com/v2/smart-issues`, `<host>/v2/smart-issues`), matching the frontend's
`noChalice` routing. A bare
path gets `/api` prepended, and on self-hosted an unknown path under the origin returns the
frontend's `index.html` with a `200` — `makeApiRequest` rejects non-JSON responses so this
surfaces as an error instead of a parse failure further down.

The replay endpoint returns signed S3 URLs for mob files (`domURL` for web, `videoURL` for
the mobile screen video), `startTs`, `duration`, `platform`, and — on instances with file
encryption enabled — `fileKey`.

`view_session_replay` only uses `domURL`. `videoURL` is **not** a message source: mobile
recordings need `IOSMessageManager` plus a video track, so mobile platforms are rejected
with a link to the full OpenReplay UI rather than rendered by the embedded engine.

### The `/cards/try` mega-endpoint

Almost all analytics use `POST /v2/api/{siteId}/cards/try` with different `metricType` values. See `src/components/chart.schema` for the full API reference with payload/response shapes.

| metricType | viewType | Purpose | API function |
|------------|----------|---------|-------------|
| `timeseries` | `lineChart` | Sessions over time | `fetchSessionsTimeseries` |
| `pathAnalysis` | `lineChart` | User journey / Sankey | `fetchPathAnalysis` |
| `webVital` | `chart` | Web Vitals (LCP, CLS, etc.) | `fetchWebVitals` |
| `table` | `table` | Top pages/browsers/countries/etc. | `fetchTableData` |
| `funnel` | `chart` | Step-by-step conversion | `fetchFunnel` |

Common payload structure (all share this base):
```json
{
  "startTimestamp": "<epoch_ms>",
  "endTimestamp": "<epoch_ms>",
  "density": 24,
  "metricOf": "sessionCount",
  "metricType": "<varies>",
  "metricFormat": "sessionCount",
  "viewType": "<varies>",
  "series": [{
    "name": "Series 1",
    "filter": {
      "filters": [],
      "excludes": [],
      "eventsOrder": "then",
      "startTimestamp": 0,
      "endTimestamp": 0
    }
  }]
}
```

### Timeseries density calculation

Density = number of data points. Based on time range:
```typescript
if (rangeHours <= 48) density = Math.max(Math.ceil(rangeHours), 12);
else if (rangeHours <= 24 * 14) density = Math.ceil(rangeHours / 4);
else density = Math.min(Math.ceil(rangeHours / 24), 90);
```

### Chart timestamp formatting

X-axis labels based on range:
- <=48h -> "Feb 18, 14:00" (include time)
- <=30d -> "Feb 18" (date only)
- Longer -> "Feb 18, 2025" (include year)

---

## Filter System

### Flow

1. Model sends simplified filters: `[{ name: "userCountry", value: ["France"], operator: "is" }]`
2. Server calls `resolveFilters(siteId, modelFilters)` which:
   - Fetches/caches filter definitions from `/v2/api/{siteId}/filters`
   - **Throws if the definitions can't be loaded.** Never fall back to an unfiltered query:
     the API answers it with the project's latest sessions, which reads as a filtered
     result (e.g. another user's sessions for a "sessions of user X" request)
   - Segments become `{isSegment: true, searchId}` (the backend expands them into the
     segment's saved filters) and features become `TAG_TRIGGER` with `[tagId]`, matching
     the frontend
   - Looks up each filter's `dataType`, `autoCaptured`, `isEvent` from definitions
   - Special-cases `userCountry`: resolves country names to ISO codes via `resolveCountryValue`
   - Builds full API filter objects
3. Resolved filters are injected into the API payload

### Where filters are injected

- **Session search**: top-level `searchPayload.filters` array
- **All /cards/try tools**: `series[0].filter.filters` array
- **Funnel**: steps go as LOCATION filters first, then user-provided filters are appended after
- **Web Vitals**: a LOCATION event filter is always required (added automatically), user filters appended

### Filter caching

Filters are cached in `state.projectFilters[siteId]`. `getOrFetchFilters` returns cache if available, otherwise fetches. In-memory only; `clearInstanceCaches` drops it (with `state.projects`) on login, logout and instance switch.

### Limitations

Event-level nested filters (e.g. filtering sessions with 4xx network requests) require nested `filters` arrays inside a parent event filter. This pattern is NOT supported by `resolveFilters` — it only handles flat attribute filters.

---

## Project Name -> ID Resolution

Tools that take `siteId` or `projectName` resolve them with `resolveSiteId(args)` (`lib/api.ts`).
A `siteId` wins; a name is looked up in `state.projects`, and the list is reloaded once on a
miss so a cold start or a newly created project still resolves. Don't hand-roll this in a
new tool — the old copy-pasted blocks drifted (some never loaded projects).

Date ranges go through `parseDateRange(startDate, endDate, defaultSpanMs)`. A bare
`YYYY-MM-DD` is a whole local calendar day (as an end bound it is inclusive), and the end
is clamped to now.

---

## React Client

### State shape (`useOpenReplayApp`)

```typescript
interface AppState {
  currentView: 'session_list' | 'chart' | 'sankey' | 'web_vitals' | 'table_chart' | 'funnel' | 'session_replay' | 'idle';
  sessionListData: { sessions: any[]; siteId: string } | null;
  chartData: any | null;
  sankeyData: any | null;
  webVitalsData: any | null;
  tableChartData: any | null;
  funnelData: any | null;
  replayData: { fileUrls: string[]; startTs: number; duration: number; sessionId: string; siteId: string; fileKey?: string } | null;
  showAuthOverlay: boolean;
  authError: string | null;
  lastFailedRequest: (() => Promise<void>) | null;
}
```

### Adding a new view type

1. Add the view name to `currentView` union in `useOpenReplayApp.ts`
2. Add corresponding data field (e.g. `newViewData: any | null`) + initial null
3. Add `if (data.type === 'new_view')` handler in `handleToolResult`
4. Create the React component in `src/components/`
5. Import and add the render condition in `App.tsx`
6. Add CSS in `src/styles/` (import in `index.css`)
7. Add API function in `lib/api.ts`
8. Add Zod schema in `lib/schemas.ts`
9. Register the tool in `lib/tools.ts` via `registerAppTool`

### Host integration hooks

```typescript
useHostStyles(app);          // Apply host CSS variables
useHostStyleVariables(app);  // Inject style vars as CSS custom properties
useAutoResize(app);          // Auto-report size changes to host
```

### Auth flow (client-side)

When `showAuthOverlay` is true, `AuthOverlay` prompts the user to log in via the browser.
The overlay only takes the OpenReplay URL — no token or credential fields. On "Login with Browser":
1. Calls `configure_backend` via `app.callServerTool()`
2. Calls `login_browser`, then polls `complete_login` until approved
3. Closes overlay, retries `lastFailedRequest` if set

`lastFailedRequest` is only populated for **app-initiated** calls: `callServerToolAndApply`
passes a retry thunk into `handleToolResult`, which stores it when the result carries
`isAuthError`. Host-driven results (`ontoolresult`) supply no thunk — those calls aren't
ours to replay — so the field stays null and nothing stale is queued.

(The `login_jwt` tool still exists for advanced/service-account use, but the UI does not expose it.)

---

## UI / CSS Patterns

### Theming

All colors use CSS custom properties defined in `theme.css` with `--or-` prefix. Dark mode overrides are in `[data-theme="dark"]` block.

Key variable groups:
- **Text**: `--or-text-primary`, `--or-text-secondary`
- **Backgrounds**: `--or-white`, `--or-gray-lightest`, `--or-gray-lighter`
- **Borders**: `--or-border`, `--or-gray-light`, `--or-gray-medium`
- **Brand**: `--or-teal` (#394EFF)
- **Status**: `--or-status-good`, `--or-status-warning`, `--or-status-bad` + `-bg` variants

### Shared CSS classes (`charts.css`)

All view components use these shared classes for consistent layout:

| Class | Purpose |
|-------|---------|
| `.view-header` | Top section wrapper (margin-bottom: 4px) |
| `.view-title` | Main heading (1.25rem, 600 weight) |
| `.view-title-date` | Date range after title (lighter, smaller) |
| `.view-subtitle` | Secondary text below header |
| `.view-container` | Bordered card wrapper (white bg, border, 8px radius) |
| `.view-empty` | Centered empty state container |
| `.view-empty-title` | Empty state heading |
| `.view-empty-text` | Empty state description |
| `.view-debug` | Collapsible raw data section |

### Component types

**ECharts components** (ChartView, SankeyView):
- Use tree-shaken ECharts imports with `SVGRenderer` (not Canvas — better for sandboxed iframes)
- Use `ResizeObserver` for responsive resize
- Read CSS variables at render time via `getComputedStyle(document.documentElement)` for label/tooltip colors — ECharts doesn't resolve `var()` natively

**Pure CSS components** (TableChartView, WebVitalsView, FunnelView, SessionList):
- Use CSS classes and `var()` directly — no special handling needed
- Status colors via `.vitals-card--good`, `.vitals-card--warning`, `.vitals-card--bad` or `var(--or-status-*)` inline

**Replay component** (SessionReplayView):
- Uses `ReplayEngine` from `src/player/`, driving the real player's DOM managers
- Fetches mob files via the `_fetch_mob_file` internal tool (bypasses sandbox CSP)
- Click-to-start overlay with OpenReplay icon, then play/pause on click
- Timeline scrubber, speed menu, skip-interval menu, skip-inactivity toggle, fullscreen
- Reloads on `code: "expired"` via `_refresh_replay_urls`
- Pauses when scrolled offscreen and resumes on return — but only if *it* paused; a
  manual pause is remembered via `pausedByScrollRef`
- CSS proxy for external stylesheets goes through `_fetch_css`, not `_fetch_mob_file`

### ECharts dark mode pattern

ECharts config values must be resolved CSS values, not `var()` references:
```typescript
const style = getComputedStyle(document.documentElement);
const textColor = style.getPropertyValue('--or-text-primary').trim() || '#333';
const bgColor = style.getPropertyValue('--or-white').trim() || '#fff';
// Use these in ECharts option: axisLabel.color, tooltip.backgroundColor, etc.
```

### Session list layout

Fixed-width columns prevent layout jumping:
- User column: `flex: 0 0 200px` (name truncated at 20 chars with `...`)
- Time column: `flex: 0 0 150px`
- Tech column: `flex: 1 1 auto` (takes remaining)

---

## Session Replay Engine (`src/player/`)

`ReplayEngine` is a thin orchestrator over the real player's managers. It owns the clock
and the message routing; everything that touches the DOM comes from `@openreplay/player`.

### Architecture

```
SessionReplayView.tsx
  └── ReplayEngine.ts                  Clock, tab routing, skip intervals, CSS proxy
        ├── Screen                     (player) sandboxed iframe + cursor + viewport
        ├── PagesManager               (player) one per recorded tab
        │     └── DOMManager           (player) mutations, styles, focus, selection
        └── ListWalker                 (player) mouse / click / scroll / resize / tab-change
```

### Data pipeline

1. `fetchAndParseMobFiles(urls, startTs, callServerTool, fileKey?)`:
   - Fetches each mob file URL via `_fetch_mob_file` (base64 response)
   - Decrypts with `decryptSessionBytes(bytes, fileKey)` when the instance encrypts files
   - Feeds bytes to a single `MobFileParser` shared across all files, so reader state
     carries across the `dom.mobs` / `dom.mobe` boundary and the format is detected once
   - Drops `tp === 9999` timestamp placeholders
   - Re-runs `fixMessageOrder` over the merged array for cross-batch time ordering

   **Do not** apply `.sort(sortIframes)` to the merged array. `MobFileParser` already ran
   it per batch, and it's a non-transitive comparator — handing it to TimSort over a
   whole session (100k+ messages) is exactly the hazard `messageOrder`'s bucket sort
   exists to avoid, and it can scramble create-order and drop subtrees.

2. `ReplayEngine.loadMessages(messages, duration)`:
   - `rewriteMessage` normalizes URL-based variants
   - DOM messages are routed to **their own tab's** `PagesManager`, keyed by `msg.tabId`.
     Merging tabs into one manager interleaves two documents' node ids.
   - Mouse / click / scroll / resize / tab-change go to shared `ListWalker`s
   - `sortDomRemoveMessages` re-sorts same-timestamp `RemoveNode`s for `<head>` children
     ahead of non-removes (mirrors `TabSessionManager`; works around tracker ordering)
   - `endTime = max(duration, lastMessageTime)` — the API duration can fall short of the
     last recorded message, which would truncate the tail

3. Playback:
   - `play()` starts a `requestAnimationFrame` loop advancing time
   - The clock is **held** (`diffTime = 0`, loop still alive) while `isStalled()` — any
     `PagesManager` reporting `cssLoading`, or a proxied stylesheet still in flight. Same
     gate as the player's `ready` flag in `Animator`; without it DOM mutations land
     against an unstyled document.
   - `move(t)` resolves the active tab from the tab-change walker, resets that tab's
     `PagesManager` on a switch so `CreateDocument` re-applies, then `moveReady(t)` on it
   - Rewinding past a tab's first message resets that tab's walker too

### PlaybackState

```typescript
interface PlaybackState {
  time: number;               // Current playback position (ms)
  playing: boolean;
  completed: boolean;         // Reached end
  endTime: number;            // max(API duration, last message time)
  ready: boolean;             // Messages loaded and engine ready
  speed: number;
  skipInactivity: boolean;
  skipIntervals: SkipInterval[];
  stalled: boolean;           // Clock held while stylesheets resolve
}
```

### CSP workaround

Mob files and external CSS live on signed S3 URLs; the sandboxed iframe's CSP blocks
direct `fetch()`. Both are proxied server-side, but through **separate tools with
different trust levels**:

- `_fetch_mob_file` — URLs come from this server's own authenticated `/replay` response.
  It only fetches URLs recorded in the allowlist (`allowMobUrls`), so the UI can't steer
  it anywhere, whatever it passes.
- `_fetch_css` — hrefs come out of the *recorded page*, i.e. attacker-influenced by
  whoever's site was recorded. Requires https, rejects IP literals, and rejects hostnames
  that resolve into private/loopback/link-local space (cloud metadata included).

Proxied CSS is injected via `adoptedStyleSheets`, never by touching the DOM tree — a
`<link>` or `<style>` insert would desync `VirtualDOM` reconciliation. `:hover`/`:focus`
are rewritten to `.-openreplay-hover`/`.-openreplay-focus` to match the player.

### Known replay limitations

1. **No mobile replay** — the engine only handles web DOM messages. `view_session_replay`
   rejects `ios`/`android` platforms with a link to the OpenReplay UI.
2. **No canvas replay** — recorded `<canvas>` needs the `canvasURL` tarballs and
   `CanvasManager#paintFrame` (the replay iframe has no `allow-scripts`, so a canvas
   can't paint itself). Canvases render blank here.
3. **Signed URL expiry** — S3 URLs expire after ~15 minutes. `_fetch_mob_file` returns
   `{ code: "expired" }` on 401/403 and the UI surfaces a "Reload replay" button wired to
   `_refresh_replay_urls`. Match on the `code`, never on the message text.
4. **Large sessions** — whole mob files are base64'd through one JSON-RPC frame. No
   streaming or chunked playback yet; very long sessions are slow to load.
5. **External resources** — images and fonts referenced by the recorded DOM break once
   their URLs go stale.

---

## CSP Configuration

MCP Apps run in sandboxed iframes with strict CSP. Declare domains in `_meta.ui.csp`:

```typescript
csp: {
  connectDomains: uiConnectDomains(),   // fetch()
  frameDomains: ["app.openreplay.com"], // embedded iframes
  resourceDomains: ["cdn.example.com"], // images, fonts, scripts
}
```

`uiConnectDomains()` (in `lib/tools.ts`) derives the list from `state.appUrl` plus a
wildcard on its registrable domain, so self-hosted instances aren't pinned to the SaaS
domain. Use it everywhere instead of hardcoding `*.openreplay.com` — `server.ts` and every
`registerAppTool` call already do.

Without proper CSP, you'll get `ERR_BLOCKED_BY_CSP` errors.

---

## Error Handling

### Server-side (tool handlers)

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      type: "error",
      error: errorMessage,
      isAuthError: errorMessage.includes("AUTH_ERROR"),
    }),
  }],
  isError: true,
};
```

### Client-side

`handleToolResult` checks `data.type === 'error'` and `data.isAuthError` to show the auth overlay.

### updateModelContext

Use `app.updateModelContext()` to inform the model about loaded data without triggering a response:
```typescript
await app.updateModelContext({
  content: [{ type: 'text', text: `Loaded ${data.sessions.length} sessions` }]
});
```
Only works client-side (in the React app, not in server-side tool handlers).

---

## Known Quirks

1. **Session search uses top-level `filters`**, while all /cards/try analytics use `series[0].filter.filters`. Don't mix them up.

2. **Path analysis uses different payload fields** than timeseries: `startPoint`, `startType`, `stepsAfter`, `columns`, `hideExcess`, `excludes`.

3. **Sankey depth is capped at 4** (`MAX_DEPTH = 4`) to avoid overwhelming the chart. Filter nodes and links by depth before rendering.

4. **Country filter values must be ISO 2-letter codes**, not full names. `resolveCountryValue` handles this mapping.

5. **Funnel steps go as LOCATION event filters** with `eventsOrder: "then"`. User-provided filters are appended after the step filters.

6. **Web Vitals requires a LOCATION event filter** in `series[0].filter.filters` even when filtering all pages — the API endpoint requires it. `fetchWebVitals` adds this automatically.

7. **Session search defaults to the last 24 hours.** `view_recent_sessions` takes optional `startDate`/`endDate`; `parseDateRange` validates them and `rangeValue` switches to `CUSTOM_RANGE`. It returns only `SESSION_FIELDS` (`lib/api.ts`) per session, since the whole result goes into the model's context.

8. **JWT tokens expire.** The persisted token in `~/.openreplay-mcp/config.json` may go stale. The auth overlay handles re-auth.

9. **All `console.error` calls are intentional** — MCP servers use stderr for logging since stdout is reserved for the stdio transport.

10. **ECharts doesn't resolve CSS `var()` in options.** Always use `getComputedStyle` to read theme variables at render time and pass resolved values. This applies to axis labels, tooltips, and any text styling.

11. **Session replay mob files are fetched server-side** because sandbox CSP blocks direct `fetch()` to S3 URLs. The `_fetch_mob_file` tool proxies these requests and returns base64. It only fetches URLs this server itself issued.

12. **Replay CSS uses a separate proxy, `_fetch_css`**, not `_fetch_mob_file`. Stylesheet hrefs come from the recorded page rather than from our API, so they get the stricter SSRF guard. Don't collapse the two tools back together.

13. **`_refresh_replay_urls`, `_fetch_mob_file` and `_fetch_css` are app-only** (`visibility: ["app"]`), so the model never sees them. Hosts that predate visibility still list them, which is what the `_` prefix is for.

14. **Version lives in `package.json` only.** `lib/version.ts` reads it at runtime for the MCP `serverInfo`; `vite.config.ts` injects it as `__APP_VERSION__` for the app's `appInfo`. `manifest.json` carries its own copy — bump both when releasing.

15. **Never vendor player source into this app.** `@openreplay/player` is a `link:` dependency pointing at `../player`. Copied files drift (missing new message types, missing ordering fixes) and replay breaks in ways that only show on newer recordings.
