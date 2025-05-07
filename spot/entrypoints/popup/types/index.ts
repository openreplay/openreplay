export type AudioDevice = {
  label: string;
  id: string;
};

export enum AppState {
  EMPTY = "empty",
  LOGIN = "login",
  READY = "ready",
  STARTING = "starting",
  RECORDING = "recording",
}

export type RecordingArea = "tab" | "desktop";
