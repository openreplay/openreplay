import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadPersistedState, abortAllPolls } from "./lib/state.js";
import { APP_VERSION } from "./lib/version.js";
import { registerUITools, registerInternalTools, uiConnectDomains } from "./lib/tools.js";

const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = existsSync(path.join(__dirname, "dist", "index.html"))
  ? path.join(__dirname, "dist")
  : path.join(__dirname, "..", "dist");
const resourceUri = "ui://openreplay/app";

// Create MCP server
console.error("[SERVER] Creating MCP server instance...");
const server = new McpServer({
  name: "openreplay-mcp-app",
  version: APP_VERSION,
});
console.error("[SERVER] MCP server instance created");

// Register all tools
registerUITools(server, resourceUri);
registerInternalTools(server);

// Register the UI resource
console.error("[SERVER] Registering UI resource...");
registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    console.error("[SERVER] UI resource requested!");
    const html = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
    console.error("[SERVER] HTML loaded, size:", html.length, "bytes");
    return {
      contents: [{
        uri: resourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        _meta: {
          ui: {
            csp: {
              connectDomains: uiConnectDomains(),
            },
          },
        },
      }],
    };
  }
);
console.error("[SERVER] UI resource registered successfully");

// Start the server
async function main() {
  console.error("[SERVER] ==========================================");
  console.error("[SERVER] Starting MCP server...");
  console.error("[SERVER] ==========================================");

  // Load persisted authentication
  await loadPersistedState();

  const transport = new StdioServerTransport();
  console.error("[SERVER] Connecting to stdio transport...");
  await server.connect(transport);
  console.error("[SERVER] ==========================================");
  console.error(`[SERVER] OpenReplay MCP Server v${APP_VERSION} READY on stdio`);
  // Listed from the registry rather than hand-maintained, so the log can't
  // drift from what's actually registered.
  const toolNames = Object.keys((server as any)._registeredTools ?? {}).sort();
  console.error(`[SERVER] Tools (${toolNames.length}): ${toolNames.join(", ")}`);
  console.error(`[SERVER] Resource: ${resourceUri}`);
  console.error("[SERVER] ==========================================");
}

// Abort any in-flight polls and exit on shutdown
// Claude Desktop doesn't send SIGINT/SIGTERM — it just closes stdin
function shutdown() {
  console.error("[SERVER] Shutting down, aborting polls...");
  abortAllPolls();
  process.exit(0);
}

process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => abortAllPolls());

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
