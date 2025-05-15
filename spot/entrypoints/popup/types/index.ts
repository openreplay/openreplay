export type AudioDevice = {
  label: string;
  id: string;
};

export enum AppState {
  LOGIN = "login",
  READY = "ready",
  STARTING = "starting",
  RECORDING = "recording",
}

export type RecordingArea = "tab" | "desktop";
