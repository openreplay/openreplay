import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const CONFIG_DIR = path.join(os.homedir(), ".openreplay-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// Project interface
export interface Project {
  projectId: string;
  name: string;
}

// In-memory store for replay messages (keyed by sessionId)
// Messages are stored here after parsing and fetched by the UI via _get_replay_data
export const replayStore = new Map<string, any[]>();

// Abort controller for cancelling in-flight polls on shutdown
export let pollAbortController: AbortController | null = null;

export function createPollAbortController(): AbortController {
  // Abort any existing poll before starting a new one
  if (pollAbortController) {
    pollAbortController.abort();
  }
  pollAbortController = new AbortController();
  return pollAbortController;
}

export function abortAllPolls() {
  if (pollAbortController) {
    pollAbortController.abort();
    pollAbortController = null;
  }
}

// One URL only — the OpenReplay instance the user types into their browser
// (e.g. https://app.openreplay.com for SaaS, https://foss.openreplay.com for
// self-hosted). The API base is derived from this in lib/api.ts.
//
// Supplied by the launcher via OPENREPLAY_URL (Claude Desktop user_config).
// Legacy: OPENREPLAY_BACKEND_URL is still accepted so existing configs don't
// break. When set, env wins over disk on every launch.
const ENV_APP_URL_RAW =
  process.env.OPENREPLAY_URL ||
  process.env.OPENREPLAY_BACKEND_URL ||
  null;

// Guard against a launcher passing an unresolved template (e.g. the literal
// "${user_config.app_url}") or any other non-http value — fall back to the
// SaaS default in that case.
const ENV_APP_URL =
  ENV_APP_URL_RAW && /^https?:\/\//.test(ENV_APP_URL_RAW) ? ENV_APP_URL_RAW : null;

const DEFAULT_URL = "https://app.openreplay.com";

// In-memory state for configuration and authentication
export const state = {
  clientId: null as string | null,
  appUrl: ENV_APP_URL || DEFAULT_URL,
  jwt: null as string | null,
  userData: null as any,
  projects: [] as Project[],
  projectFilters: {} as Record<string, any>,
  // Set by login_browser, consumed by complete_login. Not persisted — short-lived.
  pendingAuthCode: null as string | null,
};

// Load persisted state from disk
export async function loadPersistedState() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(data);
    state.clientId = config.clientId || null;

    // Accept both the new `appUrl` and legacy `backendUrl`/`frontendUrl` from disk.
    // If env supplied a URL, env always wins; if it differs from disk, the persisted
    // JWT was minted against a different instance — drop it.
    const diskAppUrl: string | undefined =
      config.appUrl || config.frontendUrl || config.backendUrl;

    if (!ENV_APP_URL && diskAppUrl) {
      state.appUrl = diskAppUrl;
    }

    const launcherOverrodeUrl =
      ENV_APP_URL && diskAppUrl && diskAppUrl !== ENV_APP_URL;

    if (launcherOverrodeUrl) {
      console.error(
        `[SERVER] Launcher URL differs from persisted (env=${ENV_APP_URL} disk=${diskAppUrl}); ` +
        `discarding stored JWT`
      );
    } else if (config.jwt) {
      state.jwt = config.jwt;
      state.userData = config.userData || null;
      console.error("[SERVER] Loaded persisted authentication from disk");
    }
  } catch (err) {
    // File doesn't exist or is invalid - that's fine
    console.error("[SERVER] No persisted state found (first run or token expired)");
  }

  console.error(`[SERVER] appUrl=${state.appUrl}`);

  // Generate and persist a client_id if one doesn't exist yet
  if (!state.clientId) {
    state.clientId = crypto.randomUUID();
    await savePersistedState();
    console.error(`[SERVER] Generated new client_id: ${state.clientId}`);
  }
}

// Save state to disk
export async function savePersistedState() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify({
        clientId: state.clientId,
        jwt: state.jwt,
        appUrl: state.appUrl,
        userData: state.userData,
      }, null, 2)
    );
    console.error("[SERVER] Saved authentication to disk");
  } catch (err) {
    console.error("[SERVER] Failed to save state:", err);
  }
}

// Generate a random auth code for browser-based login
export function generateAuthCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Clear persisted state
export async function clearPersistedState() {
  try {
    await fs.unlink(CONFIG_FILE);
    console.error("[SERVER] Cleared persisted authentication");
  } catch (err) {
    // File might not exist, that's fine
  }
}
