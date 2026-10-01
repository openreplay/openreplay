# OpenReplay MCP App

An interactive MCP (Model Context Protocol) app for exploring OpenReplay analytics and watching session replays. Connect it to your OpenReplay instance — SaaS or self-hosted — and query sessions, build charts, map user journeys, and replay recordings without leaving Claude Desktop or any MCP-enabled host.

## Features

- 🔐 **Authentication**: browser-based login (recommended) or a raw JWT token
- ⚙️ **Configurable**: works against OpenReplay Cloud and self-hosted instances
- 📊 **Analytics**: timeseries charts, Sankey user journeys, funnels, Web Vitals, and ranked tables
- 🎬 **Session replay**: full DOM reconstruction in-app, using the same player engine as the OpenReplay UI
- 🔎 **Session search**: filter by user, country, browser, device, events, metadata, and issues
- 🎨 **Theme integration**: adapts to the host's light/dark theme
- 📚 **Docs search**: answers questions from the OpenReplay documentation index

## Installation

### Prerequisites

- Node.js 20.19+ (or 22.12+) and npm — required by Vite 8
- Claude Desktop or another MCP-enabled host
- An OpenReplay account (Cloud or self-hosted)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

   `@openreplay/player` is a `link:` dependency on `../player` in this monorepo, so the
   replay engine always builds against live player source.

2. **Build the UI and the server bundle:**
   ```bash
   npm run build
   ```

   This typechecks, bundles the React app into a single `dist/index.html` (served as a
   `ui://` resource), and bundles the server to `dist-server/server.mjs`.

3. **Configure Claude Desktop:**

   Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "openreplay": {
         "command": "node",
         "args": [
           "/path/to/openreplay-mcp-app/dist-server/server.mjs"
         ],
         "env": {
           "OPENREPLAY_URL": "https://app.openreplay.com"
         }
       }
     }
   }
   ```

   Replace `/path/to/openreplay-mcp-app` with the actual path, and `OPENREPLAY_URL` with
   your instance URL if you self-host. See `claude_desktop_config.example.json`.

4. **Restart Claude Desktop**

Alternatively, `./pack.sh` produces `openreplay-mcp-desktop.mcpb`, a bundle Claude Desktop
can install directly. It prompts for the instance URL via `user_config` in `manifest.json`.

## Usage

### 1. Point it at your instance (self-hosted only)

```
Configure OpenReplay to use https://openreplay.my-company.com
```

Give it the URL you type into your browser — **not** the API host. The API base is derived
automatically (`api.openreplay.com` for Cloud, `<host>/api` otherwise). This is only needed
if you didn't set `OPENREPLAY_URL` in the host config.

### 2. Log in

```
Log in to OpenReplay
```

You get an authorize URL to open yourself. Approve access in the OpenReplay tab and return
to the app. Advanced users can authenticate with a raw JWT instead.

### 3. Explore analytics

```
Show me sessions over the last 7 days for project MyApp
Show me the top browsers this week
What's the drop-off in the signup funnel?
How are Web Vitals trending on the checkout page?
Map the user journey from the landing page
```

### 4. Watch a replay

```
Show me recent sessions with JS errors, then replay the second one
```

The replay runs in-app: mob files are fetched through the server, parsed, and reconstructed
into a sandboxed iframe with a timeline, speed control, skip-inactivity, and fullscreen.

## Available MCP Tools

### UI tools

These render a view alongside the result.

| Tool | Purpose |
|------|---------|
| `view_recent_sessions` | Session list with user info, timing, device, play buttons |
| `view_chart` | Timeseries chart (sessions over time) |
| `view_user_journey` | Sankey diagram of navigation paths |
| `view_web_vitals` | Core Web Vitals cards + percentile table |
| `view_table_chart` | Ranked bars (top pages, browsers, countries…) |
| `view_funnel` | Step-by-step conversion funnel |
| `view_session_replay` | Interactive replay with DOM reconstruction |

### Server tools

| Tool | Purpose |
|------|---------|
| `configure_backend` | Set the OpenReplay instance URL (`appUrl`) |
| `login_browser` | Start browser login; returns an authorize URL |
| `complete_login` | Finish browser login by polling for approval |
| `login_jwt` | Authenticate with a raw JWT (advanced / service account) |
| `logout` | Clear auth and delete the persisted token |
| `get_auth_status` | Check authentication state |
| `list_projects` / `get_project_id` | List projects; resolve a name to an ID |
| `get_available_filters` | Filter catalog for a project |
| `fetch_sessions` | Raw session JSON, no UI |
| `get_session_details` | Replay metadata + session events |
| `get_session_replay` | Replay URL for a session |
| `fetch_events` / `fetch_event_definitions` / `fetch_users` | Data-management queries |
| `fetch_chart_data` | Generic `/cards/try` proxy |
| `search_docs` | Search the OpenReplay documentation index |

Tools prefixed with `_` (`_refresh_replay_urls`, `_fetch_mob_file`, `_fetch_css`) are called
by the app's own UI, not by the model.

## Architecture

### Server (`server.ts`, `lib/`)

- MCP server over stdio, built on the MCP SDK v2 packages (`@modelcontextprotocol/server`, `client`, `core`) and `@modelcontextprotocol/ext-apps` 2.x
- Registers all tools (`lib/tools.ts`), talks to the OpenReplay REST API (`lib/api.ts`)
- Holds auth and caches in memory (`lib/state.ts`), persisting the JWT to disk
- Serves the bundled React UI as a single `ui://` resource

### Client (`src/`)

- React 19 + TypeScript, bundled to one HTML file by Vite + `vite-plugin-singlefile`
- ECharts (tree-shaken, SVG renderer) for charts; plain CSS for the rest
- Replay engine (`src/player/`) driving the managers from `@openreplay/player`
- Theme-aware styling via the host's CSS variables

### Data flow

```
Model → MCP tool call → server → OpenReplay API
                                    ↓
                          JSON with a `type` field
                                    ↓
                    useOpenReplayApp.handleToolResult
                                    ↓
                       the matching React view
```

## Development

### Scripts

- `npm run typecheck` — typecheck this app (ignores `../player`'s pre-existing errors)
- `npm run build` — typecheck + build UI + build server bundle
- `npm run serve` — run the server from source with `tsx`
- `npm run dev` — build, then serve
- `./pack.sh` — build and produce the `.mcpb` desktop bundle

### Project structure

```
openreplay-mcp-app/
├── server.ts               # MCP server entry point
├── manifest.json           # Desktop bundle manifest (.mcpb)
├── lib/                    # Tools, API client, state, schemas
├── scripts/typecheck.mjs   # tsc wrapper scoped to this app
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # View router + host integration
│   ├── hooks/              # useOpenReplayApp (state + result dispatch)
│   ├── components/         # One component per view
│   ├── player/             # ReplayEngine + mob file pipeline
│   ├── styles/             # Theme and per-view CSS
│   └── utils/              # Host logging, formatting
├── dist/                   # Built single-file UI (generated)
├── dist-server/            # Built server bundle (generated)
└── vite.config.ts
```

`AGENTS.md` has the detailed guide: API shapes, the filter system, replay internals, and
the quirks worth knowing before changing anything.

## Security notes

- The JWT is persisted to `~/.openreplay-mcp/config.json` so the session survives restarts.
  The directory is created `0700` and the file written `0600` (owner read/write only). Run
  `logout` to delete it.
- JWTs are sent only via the `Authorization: Bearer` header — never embedded in replay or
  session URLs.
- Browser login returns an authorize URL for you to open; the server never launches a
  browser process.
- The configured instance URL must be `https`.
- The replay iframe is sandboxed with `allow-same-origin` only — no `allow-scripts` — so a
  crafted recording cannot execute JavaScript.
- Server-side fetch proxies are scoped: `_fetch_mob_file` will only fetch URLs the server
  itself issued from the authenticated replay endpoint, and `_fetch_css` (used for
  stylesheet hrefs found inside a *recorded page*) rejects non-https URLs, IP literals, and
  hostnames resolving into private, loopback, or link-local space. Both cap response size.
- Recordings from instances with file encryption enabled are decrypted in the browser; the
  key travels with the replay metadata and is never written to disk.

## Limitations

- **Mobile sessions** (iOS/Android) aren't replayable in-app — the engine handles web DOM
  recordings only. `view_session_replay` returns a link to the OpenReplay UI instead.
- **Canvas elements** render blank; canvas replay needs the separate canvas tarballs.
- **Signed mob URLs expire** after ~15 minutes. The replay view offers a "Reload replay"
  button that re-signs them.
- **Long sessions** load slowly — whole mob files are transferred in one response, with no
  streaming yet.
- **Nested event filters** (e.g. sessions with 4xx requests to a specific path) are only
  partially supported by the filter resolver.

## Troubleshooting

### "Not authenticated"
Log in first (`login_browser`, or `login_jwt` for a raw token). Persisted JWTs expire — the
auth overlay handles re-auth.

### Replay won't load
Check that the session is a web recording (mobile isn't supported), and that the mob URLs
haven't expired — use "Reload replay". If the instance encrypts recording files, make sure
the replay metadata includes `fileKey`.

### Charts empty
Verify the project has data in the requested range, and that filters resolved — run
`get_available_filters` to see valid filter names for the project.

### MCP server not connecting
1. Check the path in `claude_desktop_config.json` points at `dist-server/server.mjs`
2. Make sure you ran `npm run build`
3. Restart Claude Desktop
4. Check the logs: `~/Library/Logs/Claude/`
