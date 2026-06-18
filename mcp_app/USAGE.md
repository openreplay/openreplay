# OpenReplay MCP App - Usage Guide

## Quick Start

### 1. Install and Build

```bash
cd /Users/nikitamelnikov/Documents/work/work/openreplay/openreplay-mcp-app
npm install
npm run build
```

### 2. Configure Your Client

The app reads the `OPENREPLAY_BACKEND_URL` environment variable to set the default backend URL. If not set, it defaults to `https://foss.openreplay.com`.

#### Claude Desktop

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openreplay": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/openreplay-mcp-app/node_modules/.bin/tsx",
        "/ABSOLUTE/PATH/TO/openreplay-mcp-app/server.ts"
      ],
      "env": {
        "OPENREPLAY_BACKEND_URL": "https://your-openreplay-instance.com"
      }
    }
  }
}
```

#### ChatGPT

Copy `.env.example` to `.env` and set your backend URL:

```bash
cp .env.example .env
```

```env
OPENREPLAY_BACKEND_URL=https://your-openreplay-instance.com
```

#### Codex

Copy `config.example.toml` to `config.toml` and set your backend URL:

```bash
cp config.example.toml config.toml
```

```toml
[env]
OPENREPLAY_BACKEND_URL = "https://your-openreplay-instance.com"
```

### 3. Restart Your Client

Completely quit and restart your client for the changes to take effect.

## Using the App

### Example Conversation Flow

**Step 1: Configure Backend (if self-hosted)**
```
Configure my OpenReplay backend to use https://api.mycompany.com
```

**Step 2: Login**
```
Login to OpenReplay with:
- Email: john@example.com
- Password: mypassword123
```

**Step 3: Fetch Chart Data**
```
Fetch the dashboard chart data from /api/v1/dashboard/sessions for site ID 123
```

**Step 4: View the Charts**
The UI will automatically open showing the chart data with interactive ECharts visualizations.

**Step 5: View Session Replay**
```
Show me the session replay for session abc-def-123
```

## Working with Different OpenReplay Endpoints

### Common API Endpoints

1. **Dashboard Sessions Chart**
   ```
   Fetch chart data from /api/v1/dashboard/sessions with siteId: 123
   ```

2. **User Sessions**
   ```
   Fetch chart data from /api/v1/sessions/stats with siteId: 123
   ```

3. **Performance Metrics**
   ```
   Fetch chart data from /api/v1/metrics/performance with siteId: 123
   ```

4. **Error Tracking**
   ```
   Fetch chart data from /api/v1/errors/overview with siteId: 123
   ```

## Expected Data Format

The app works best with OpenReplay's standard chart format:

```json
{
  "chart": [
    {
      "time": "Mon 15:00",
      "timestamp": 1707667200000,
      "Sessions": 150,
      "Users": 100,
      "Errors": 5
    },
    {
      "time": "Mon 16:00",
      "timestamp": 1707670800000,
      "Sessions": 200,
      "Users": 150,
      "Errors": 3
    }
  ],
  "namesMap": ["Sessions", "Users", "Errors"]
}
```

### Comparison Data (Previous Period)

The app also supports comparison data:

```json
{
  "data": {
    "chart": [ /* current period data */ ],
    "namesMap": ["Sessions", "Users"]
  },
  "compData": {
    "chart": [ /* previous period data */ ],
    "namesMap": ["Previous Sessions", "Previous Users"]
  }
}
```

## Advanced Usage

### Direct Tool Calls

You can also call the MCP tools directly:

**Check Authentication Status**
```
Check my OpenReplay authentication status
```

**Configure Backend**
```
Set OpenReplay backend to https://openreplay.your-domain.com
```

**Get Session Replay URL**
```
Get the replay URL for session xyz-789
```

### Custom API Calls

If you need to call a custom endpoint:

```
Fetch chart data from /api/v1/custom/endpoint with params:
{
  "siteId": "123",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

## UI Features

### Configuration Panel
- Set backend URL for self-hosted instances
- Login with email/password
- Fetch data from any API endpoint
- View authentication status

### Chart View
- Interactive ECharts visualizations
- Zoom and pan controls
- Tooltip with data details
- Legend to show/hide series
- Raw data inspector for debugging

### Session Replay
- Embedded iframe viewer
- Session ID display
- Open in new tab option
- Secure sandbox attributes

## Troubleshooting

### Server Won't Start
```bash
# Test the server manually
cd /Users/nikitamelnikov/Documents/work/work/openreplay/openreplay-mcp-app
npm run serve
```

If you see "OpenReplay MCP Server running on stdio", the server is working.

### Charts Not Rendering
1. Open the chart view
2. Expand "Raw Data" section
3. Check if the data structure matches the expected format
4. Verify that `chart` and `namesMap` fields exist

### Authentication Fails
- Verify your OpenReplay credentials
- Check the backend URL is correct
- For self-hosted: ensure the API is accessible
- Check CORS settings on your OpenReplay instance

### Session Replay Iframe Blocked
Some browsers may block iframe content. To fix:
1. Click "Open in New Tab" button
2. Or adjust your browser's iframe/CORS settings

## Performance Tips

1. **Large Datasets**: The app can handle large chart datasets, but for better performance, limit data to the last 30-90 days

2. **Multiple Charts**: If you need to view multiple charts, fetch them one at a time for better UI responsiveness

3. **Session Replays**: Session replays are loaded lazily, so they won't impact initial load time

## Security Best Practices

1. **Never commit credentials**: Don't hardcode passwords in scripts
2. **Use environment variables**: For automated setups, use env vars
3. **Rotate tokens**: Regularly update your OpenReplay credentials
4. **Self-hosted security**: Ensure your OpenReplay API uses HTTPS

## API Reference

### Tool: `configure_backend`
```typescript
{
  backendUrl: string // Full URL to OpenReplay API (e.g., "https://api.openreplay.com")
}
```

### Tool: `login`
```typescript
{
  email: string,    // Your OpenReplay account email
  password: string  // Your OpenReplay account password
}
```

### Tool: `fetch_chart_data`
```typescript
{
  endpoint: string,                    // API endpoint (e.g., "/api/v1/dashboard/chart")
  params?: Record<string, any>,        // Query parameters
  siteId?: string                      // Site/Project ID
}
```

### Tool: `get_session_replay`
```typescript
{
  sessionId: string,  // Session ID to replay
  siteId?: string     // Site/Project ID
}
```

### Tool: `view_openreplay`
```typescript
{
  chartData?: any,    // Chart data to display
  sessionId?: string  // Session ID for replay
}
```
