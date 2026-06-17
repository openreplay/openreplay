# OpenReplay MCP App

An interactive MCP (Model Context Protocol) app for viewing OpenReplay charts and session replays. This app allows you to connect to your OpenReplay instance (hosted or self-hosted), authenticate, fetch chart data, and view session replays - all from within Claude Desktop or any MCP-enabled host.

## Features

- 🔐 **Authentication**: Secure login with email/password
- ⚙️ **Configurable**: Support for both hosted and self-hosted OpenReplay instances
- 📊 **Charts**: View analytics charts using Apache ECharts (matching OpenReplay's UI)
- 🎬 **Session Replay**: Watch session recordings in an embedded iframe
- 🎨 **Theme Integration**: Automatically adapts to Claude Desktop's theme
- 🚀 **MCP Tools**: Exposes server tools for data fetching and configuration

## Installation

### Prerequisites

- Node.js 18+ and npm
- Claude Desktop or another MCP-enabled host
- OpenReplay account (hosted or self-hosted instance)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the UI:**
   ```bash
   npm run build
   ```

3. **Configure Claude Desktop:**

   Add this to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "openreplay": {
         "command": "node",
         "args": [
           "/path/to/openreplay-mcp-app/node_modules/.bin/tsx",
           "/path/to/openreplay-mcp-app/server.ts"
         ]
       }
     }
   }
   ```

   Replace `/path/to/openreplay-mcp-app` with the actual path to this directory.

4. **Restart Claude Desktop**

## Usage

### 1. Configure Backend (for self-hosted)

If you're using a self-hosted OpenReplay instance:

```
Configure the OpenReplay backend to use https://api.your-domain.com
```

### 2. Login

```
Login to OpenReplay with email: your-email@example.com and password: your-password
```

### 3. View Charts

```
Show me the OpenReplay dashboard chart for site ID 123
```

The app will:
1. Fetch chart data from your OpenReplay API
2. Render interactive charts using ECharts
3. Display the data in the UI with the same styling as OpenReplay

### 4. View Session Replays

```
Show me the session replay for session ID abc-123-def
```

The app will:
1. Generate the replay URL
2. Display the session in an iframe
3. Provide a link to open in a new tab

## Available MCP Tools

### Server Tools

These tools can be called by Claude or your application:

#### `configure_backend`
Configure the OpenReplay backend URL.

```typescript
{
  backendUrl: "https://api.your-domain.com"
}
```

#### `login`
Authenticate with OpenReplay.

```typescript
{
  email: "your-email@example.com",
  password: "your-password"
}
```

#### `fetch_chart_data`
Fetch chart data from the OpenReplay API.

```typescript
{
  endpoint: "/api/v1/dashboard/chart",
  params: { siteId: "123" },
  siteId: "123"
}
```

#### `get_session_replay`
Get the session replay URL.

```typescript
{
  sessionId: "abc-123-def",
  siteId: "123"
}
```

#### `get_auth_status`
Check authentication status.

```typescript
{}
```

#### `view_openreplay`
Open the interactive UI viewer (this is the main UI tool).

```typescript
{
  chartData: { ... },
  sessionId: "abc-123-def"
}
```

## Architecture

### Server (`server.ts`)

- MCP server implementation using `@modelcontextprotocol/sdk`
- Exposes tools for authentication, configuration, and data fetching
- Handles API requests to OpenReplay backend
- Serves the bundled React UI as an MCP resource

### Client (`src/`)

- React 19 + TypeScript
- ECharts for data visualization
- MCP App integration using `@modelcontextprotocol/ext-apps/react`
- Theme-aware styling that adapts to host environment

### Data Flow

```
Claude/User → MCP Tool Call → Server → OpenReplay API
                                      ↓
                                   Process Response
                                      ↓
                                   Return to UI
                                      ↓
                                   Render Charts/Replay
```

## Development

### Scripts

- `npm run build` - Build the React UI
- `npm run serve` - Start the MCP server
- `npm run dev` - Build and serve

### Project Structure

```
openreplay-mcp-app/
├── server.ts              # MCP server implementation
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Main app component with MCP integration
│   ├── styles.css        # Global styles
│   └── components/
│       ├── ConfigPanel.tsx    # Configuration UI
│       ├── ChartView.tsx      # Chart rendering
│       └── SessionReplay.tsx  # Session replay viewer
├── dist/                 # Built UI (generated)
├── vite.config.ts       # Vite bundler config
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies and scripts
```

## Chart Data Format

The app expects chart data in OpenReplay's format:

```json
{
  "chart": [
    {
      "time": "Mon",
      "timestamp": 1234567890,
      "Series 1": 100,
      "Series 2": 200
    },
    ...
  ],
  "namesMap": ["Series 1", "Series 2"]
}
```

## Customization

### Adding New Chart Types

Edit `src/components/ChartView.tsx` to add support for bar charts, pie charts, etc. The component uses ECharts, so you can add any chart type from the [ECharts examples](https://echarts.apache.org/examples/).

### Styling

The app uses CSS variables for theming. All colors, fonts, and spacing automatically adapt to the host's theme through MCP's `onhostcontextchanged` handler.

## Security Notes

- Credentials are stored in memory only (not persisted)
- JWT tokens are included in API requests via Authorization header
- Session replay iframe uses `sandbox` attribute for security
- All API requests go through the MCP server (not directly from UI)

## Troubleshooting

### "Not authenticated" error
Make sure you've called the `login` tool first before fetching data.

### Charts not displaying
Check the raw data format in the debug section. The app expects OpenReplay's chart data structure.

### Session replay not loading
Verify the session ID is correct and you have access to view it in your OpenReplay instance.

### MCP server not connecting
1. Check the path in `claude_desktop_config.json`
2. Make sure you ran `npm run build`
3. Restart Claude Desktop
4. Check Claude Desktop logs: `~/Library/Logs/Claude/`
