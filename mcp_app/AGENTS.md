# OpenReplay MCP App — Agent Guide

Reference: https://modelcontextprotocol.github.io/ext-apps/api/documents/Patterns.html

---

## Project Structure

```
server.ts                    MCP server entry point (stdio transport)
lib/
  tools.ts                   All tool registrations (UI + internal)
  api.ts                     OpenReplay REST API client functions
  state.ts                   In-memory state (auth, projects, filter cache)
  schemas.ts                 Zod validation schemas for tool inputs
  countries.ts               Country name <-> ISO code resolver
  countriesList.ts           Raw country code -> name map (data only)
src/
  App.tsx                    Main React component (view router)
  hooks/useOpenReplayApp.ts  State management + tool result dispatcher
  components/
    ChartView.tsx            ECharts timeseries line chart
    SankeyView.tsx           ECharts Sankey / user journey diagram
    TableChartView.tsx       ECharts horizontal bar chart (top X)
    WebVitalsView.tsx        Pure CSS vitals cards + percentile table
    FunnelView.tsx           Pure CSS step-by-step conversion bars
    SessionList.tsx          Session list with play buttons
    SessionReplayView.tsx    Interactive session replay player
    AuthOverlay.tsx          JWT login overlay
    ConfigPanel.tsx          Backend/auth/chart config forms (dev)
    IdleView.tsx             Empty state placeholder
    chart.schema             API reference for /cards/try endpoint
  player/
    ReplayEngine.ts          Core replay engine (play, pause, jump, timeline)
    DOMManager.ts            DOM construction from recorded messages
    VirtualDOM.ts            Virtual DOM representation and diffing
    Screen.ts                Viewport/iframe management for replay
    StylesManager.ts         CSS rules injection and management
    Cursor.ts                Mouse cursor position tracking
    SelectionManager.ts      Text selection tracking
    FocusManager.ts          Input focus tracking
    PagesManager.ts          Page/navigation tracking during replay
    ListWalker.ts            Message list traversal utilities
    MFileReader.ts           .mob file format reader
    PrimitiveReader.ts       Binary primitive data reader
    RawMessageReader.gen.ts  Generated message parser
    raw.gen.ts               Generated raw message types
    rewriteMessage.ts        Message transformation/normalization
    safeCSSRules.ts          CSS security sanitization
    fetchAndParseMobFiles.ts Fetch + decompress + parse mob files
    unpack.ts                Zstd/fflate decompression
    types.ts                 PlaybackState and shared types
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
```

### Build

Vite builds the React app into a **single HTML file** (`dist/index.html`) via `vite-plugin-singlefile`. The server reads this file and serves it as a `ui://` resource. No separate asset hosting needed.

Run: `npm run build` (includes `tsc` + Vite)
Type check only: `npx tsc --noEmit`

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
| `login` | Email/password auth |
| `login_jwt` | JWT token auth (persisted to disk) |
| `logout` | Clear auth and remove persisted token |
| `get_auth_status` | Check auth state |
| `list_projects` | Fetch all projects (caches in state) |
| `get_project_id` | Resolve project name -> ID |
| `fetch_sessions` | Raw session JSON (no UI) |
| `fetch_chart_data` | Generic API proxy |
| `get_session_replay` | Get session replay URL |
| `get_session_details` | Session replay metadata + events |
| `get_available_filters` | Filter catalog for a project |
| `_refresh_replay_urls` | Re-fetch signed mob file URLs (internal, called by UI when URLs expire) |
| `_fetch_mob_file` | Fetch mob/CSS file by URL, return base64 (internal, bypasses sandbox CSP) |

### Tool Visibility (MCP Apps extension)

Only applies to `registerAppTool`. Set in `_meta.ui.visibility`:

| Value | Meaning |
|-------|---------|
| `["model"]` | AI model can call, React app cannot via `callServerTool()` |
| `["app"]` | React app can call via `callServerTool()`, hidden from model |
| `["model", "app"]` | Both (default if omitted) |

All 7 UI tools use `["model"]`. The React app only calls tools for auth (`configure_backend`, `login_jwt`) and replay internals (`_refresh_replay_urls`, `_fetch_mob_file`) — those are internal tools and don't use visibility.

`server.registerTool` does NOT support the visibility feature. It's an MCP Apps extension only for `registerAppTool`.

### Tool Description Steering

Tool descriptions double as instructions for the AI model:

```typescript
// PREFERRED: model should always pick this for session viewing
description: "PREFERRED tool for fetching and displaying sessions. Always use this tool when..."

// Demoted: model should only pick this in specific cases
description: "Internal tool: fetch sessions as raw JSON without UI. Only use this when..."
```

All UI tools include a TIP in their description guiding the model to use `view_recent_sessions` with the same filters for session drill-down.

---

## OpenReplay API

### Base URL

Default: `https://foss.openreplay.com`. Configurable via `configure_backend` tool.

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
| `/api/pa/{siteId}/filters` | GET | Available filter definitions |

The replay endpoint returns signed S3 URLs for mob files (`domURL` for web, `videoURL` for mobile), `startTs`, `duration`, and `platform`.

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
   - Fetches/caches filter definitions from `/api/pa/{siteId}/filters`
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

Filters are cached in `state.projectFilters[siteId]`. `getOrFetchFilters` returns cache if available, otherwise fetches. Cache is never cleared — in-memory only.

### Limitations

Event-level nested filters (e.g. filtering sessions with 4xx network requests) require nested `filters` arrays inside a parent event filter. This pattern is NOT supported by `resolveFilters` — it only handles flat attribute filters.

---

## Project Name -> ID Resolution

Multiple tools accept `projectName` as an alternative to `siteId`. The resolution pattern:

```typescript
let siteId = args.siteId;
if (args.projectName && !siteId) {
  const resolvedId = getProjectIdByName(args.projectName);
  if (!resolvedId) {
    if (state.projects.length === 0) {
      await fetchProjects();  // Auto-fetch if cache empty
      const retryId = getProjectIdByName(args.projectName);
      if (retryId) siteId = retryId;
    }
    if (!siteId) {
      throw new Error(`Project "${args.projectName}" not found. Available: ${...}`);
    }
  } else {
    siteId = resolvedId;
  }
}
```

This pattern repeats in every tool that needs project resolution. Copy this block when adding a new tool.

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
  replayData: { fileUrls: string[]; startTs: number; duration: number; sessionId: string; siteId: string } | null;
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

When `showAuthOverlay` is true, `AuthOverlay` renders a form. On submit:
1. Calls `configure_backend` via `app.callServerTool()`
2. Calls `login_jwt` via `app.callServerTool()`
3. Closes overlay, retries `lastFailedRequest` if set

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

**ECharts components** (ChartView, SankeyView, TableChartView):
- Use tree-shaken ECharts imports with `SVGRenderer` (not Canvas — better for sandboxed iframes)
- Use `ResizeObserver` for responsive resize
- Read CSS variables at render time via `getComputedStyle(document.documentElement)` for label/tooltip colors — ECharts doesn't resolve `var()` natively

**Pure CSS components** (WebVitalsView, FunnelView, SessionList):
- Use CSS classes and `var()` directly — no special handling needed
- Status colors via `.vitals-card--good`, `.vitals-card--warning`, `.vitals-card--bad` or `var(--or-status-*)` inline

**Replay component** (SessionReplayView):
- Uses the `ReplayEngine` from `src/player/` — a full DOM reconstruction engine
- Fetches mob files via `_fetch_mob_file` internal tool (bypasses sandbox CSP)
- Click-to-start overlay with OpenReplay icon, then play/pause on click
- Timeline scrubber with play/pause button and time display
- Handles expired signed URLs with retry via `_refresh_replay_urls`
- CSS proxy for external stylesheets (also fetched via `_fetch_mob_file`)

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

The replay engine reconstructs recorded DOM snapshots and user interactions inside a sandboxed iframe.

### Architecture

```
SessionReplayView.tsx
  └── ReplayEngine.ts          Orchestrator: timeline, playback, state
        ├── Screen.ts           Creates sandboxed iframe, manages viewport
        ├── DOMManager.ts       Applies DOM mutations (create/move/remove nodes)
        │     └── VirtualDOM.ts Virtual node tree mirroring recorded DOM
        ├── StylesManager.ts    Injects <style> rules into iframe
        ├── Cursor.ts           Renders mouse cursor position
        ├── FocusManager.ts     Tracks input focus
        ├── SelectionManager.ts Tracks text selection
        ├── PagesManager.ts     Handles page navigations
        └── ListWalker.ts       Iterates sorted message list by timestamp
```

### Data pipeline

1. `fetchAndParseMobFiles(urls, startTs, callServerTool)`:
   - Fetches each mob file URL via `_fetch_mob_file` (base64 response)
   - Decompresses with zstd (`fzstd`) or gzip (`fflate`)
   - Parses binary messages via `MFileReader` + `RawMessageReader.gen`
   - Runs `rewriteMessage` to normalize timestamps relative to `startTs`
   - Returns flat sorted `Message[]` array

2. `ReplayEngine.loadMessages(messages, duration)`:
   - Stores messages in `ListWalker`
   - Sets `endTime` from duration
   - Marks `ready: true` in playback state

3. Playback:
   - `play()` starts a `requestAnimationFrame` loop advancing time
   - `ListWalker` yields messages up to current time
   - Each message type is routed to the appropriate manager (DOM, styles, cursor, etc.)
   - `jump(time)` seeks to a specific timestamp by replaying from start

### PlaybackState

```typescript
interface PlaybackState {
  time: number;      // Current playback position (ms)
  playing: boolean;  // Is playing
  completed: boolean; // Reached end
  endTime: number;   // Total duration (ms)
  ready: boolean;    // Messages loaded and engine ready
}
```

### CSP workaround

Mob files and external CSS are hosted on signed S3 URLs. The sandboxed iframe's CSP blocks direct `fetch()`. Solution:
- `SessionReplayView` calls `_fetch_mob_file` server tool which fetches on the Node.js side and returns base64
- `ReplayEngine.setCssProxy()` uses the same pattern for external stylesheets referenced in DOM snapshots

### Known replay limitations

1. **No mobile replay** — mob file parsing only handles web DOM messages. Mobile sessions (`videoURL`) would need a video player.
2. **Signed URL expiry** — S3 URLs expire after ~15 minutes. The "Reload replay" button calls `_refresh_replay_urls` to get fresh URLs.
3. **Large sessions** — Sessions with many DOM mutations can be slow to parse. No streaming/chunked playback yet.
4. **External resources** — Images, fonts, and other assets referenced by the recorded DOM may be broken if their URLs are no longer valid.

---

## CSP Configuration

MCP Apps run in sandboxed iframes with strict CSP. Declare domains in `_meta.ui.csp`:

```typescript
csp: {
  connectDomains: ["foss.openreplay.com", "*.openreplay.com"],  // fetch()
  frameDomains: ["foss.openreplay.com"],    // embedded iframes
  resourceDomains: ["cdn.example.com"],     // images, fonts, scripts
}
```

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

7. **`fetchRecentSessions` hardcodes `LAST_24_HOURS`** as the time range. Configurable ranges would need `startDate`/`endDate` params.

8. **JWT tokens expire.** The persisted token in `~/.openreplay-mcp/config.json` may go stale. The auth overlay handles re-auth.

9. **All `console.error` calls are intentional** — MCP servers use stderr for logging since stdout is reserved for the stdio transport.

10. **ECharts doesn't resolve CSS `var()` in options.** Always use `getComputedStyle` to read theme variables at render time and pass resolved values. This applies to axis labels, tooltips, and any text styling.

11. **Session replay mob files are fetched server-side** because sandbox CSP blocks direct `fetch()` to S3 URLs. The `_fetch_mob_file` tool proxies these requests and returns base64.

12. **Replay CSS proxy** works the same way — external stylesheets referenced in recorded DOM snapshots are fetched via `_fetch_mob_file` and injected into the replay iframe.

13. **`_refresh_replay_urls` and `_fetch_mob_file` are prefixed with `_`** to signal they're internal tools called by the UI only, not by the AI model.
