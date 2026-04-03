import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

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

// In-memory state for configuration and authentication
export const state = {
  backendUrl: process.env.OPENREPLAY_BACKEND_URL || "https://foss.openreplay.com",
  jwt: null as string | null,
  userData: null as any,
  projects: [] as Project[],
  projectFilters: {} as Record<string, any>,
};

// Load persisted state from disk
export async function loadPersistedState() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(data);
    if (config.jwt) {
      state.jwt = config.jwt;
      state.backendUrl = config.backendUrl || state.backendUrl;
      state.userData = config.userData || null;
      console.error("[SERVER] Loaded persisted authentication from disk");
    }
  } catch (err) {
    // File doesn't exist or is invalid - that's fine
    console.error("[SERVER] No persisted state found (first run or token expired)");
  }
}

// Save state to disk
export async function savePersistedState() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify({
        jwt: state.jwt,
        backendUrl: state.backendUrl,
        userData: state.userData,
      }, null, 2)
    );
    console.error("[SERVER] Saved authentication to disk");
  } catch (err) {
    console.error("[SERVER] Failed to save state:", err);
  }
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
