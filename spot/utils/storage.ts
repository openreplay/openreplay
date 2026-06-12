import { storage } from "wxt/utils/storage";

export interface Settings {
  openInNewTab: boolean;
  consoleLogs: boolean;
  networkLogs: boolean;
  useDebugger: boolean;
  ingestPoint: string;
  showIngest?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  openInNewTab: true,
  consoleLogs: true,
  networkLogs: true,
  useDebugger: false,
  ingestPoint: "https://app.openreplay.com",
};

/** Persisted user settings (chrome.storage.local key: "settings"). */
export const settingsStore = storage.defineItem<Settings>("local:settings", {
  fallback: DEFAULT_SETTINGS,
});

/** Read settings, merge a partial patch and persist; returns the merged value. */
export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await settingsStore.getValue();
  const next = { ...current, ...patch };
  await settingsStore.setValue(next);
  return next;
}

/** Auth token (chrome.storage.local key: "jwtToken"). Empty string = logged out. */
export const jwtTokenStore = storage.defineItem<string>("local:jwtToken", {
  fallback: "",
});

/** Microphone picker preferences used by the popup. */
export const audioPermStore = storage.defineItem<boolean>("local:audioPerm", {
  fallback: false,
});
export const selectedAudioIdStore = storage.defineItem<string>(
  "local:selectedAudioId",
  { fallback: "" },
);
export const micOnStore = storage.defineItem<boolean>("local:micOn", {
  fallback: false,
});

export type RecordingStatus = "recording" | "paused" | "stopped";

/**
 * Recording-session coordination state. Lives in session storage so that the
 * MV3 service worker can rehydrate it after an idle shutdown and the top-level
 * navigation/tab listeners can decide whether to keep following the user.
 */
export interface RecState {
  recording: RecordingStatus;
  area: "tab" | "desktop" | null;
  activeTabId: number | null;
  /** Tab being recorded in "tab" mode; used to discard if it is closed. */
  trackedTab: number | null;
  /** Last tab the recording UI was moved to (desktop mode follow). */
  previousTab: number | null;
  /** 0 = no perm, 1 = muted, 2 = unmuted. */
  audioPerm: 0 | 1 | 2;
  microphone: boolean;
  withNetwork: boolean;
  withConsole: boolean;
}

export const DEFAULT_REC_STATE: RecState = {
  recording: "stopped",
  area: null,
  activeTabId: null,
  trackedTab: null,
  previousTab: null,
  audioPerm: 0,
  microphone: false,
  withNetwork: true,
  withConsole: true,
};

export const recStateStore = storage.defineItem<RecState>("session:recState", {
  fallback: DEFAULT_REC_STATE,
});

export async function patchRecState(patch: Partial<RecState>): Promise<RecState> {
  const current = await recStateStore.getValue();
  const next = { ...current, ...patch };
  await recStateStore.setValue(next);
  return next;
}
