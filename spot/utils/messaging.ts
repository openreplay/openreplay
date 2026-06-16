import { defineExtensionMessaging } from "@webext-core/messaging";
import type { Metric } from "web-vitals";
import type { SpotNetworkRequest } from "./networkTrackingUtils";
import type { Settings } from "./storage";

export interface SpotLog {
  level: string;
  msg: string;
  time: number;
}
export interface SpotClick {
  time: number;
  label: string;
}
export interface NavTiming {
  fcpTime: number;
  visuallyComplete: number;
  timeToInteractive: number;
}
export interface SpotLocation {
  time: number;
  location: string;
  navTiming: NavTiming;
}
export interface SpotErrorEvent {
  title: string;
  time: number;
}

export interface SpotMeta {
  name?: string;
  comment?: string;
  useHook?: boolean;
  preview?: string;
  resolution?: string;
  browserVersion?: string | null;
  crop?: [number, number];
}

export type RecArea = "tab" | "desktop";

/**
 * Typed protocol for extension-runtime messaging. Page-world communication
 * (window.postMessage) is a separate channel defined in pageMessages.ts.
 */
export interface ProtocolMap {
  // popup -> background
  "popup:start"(data: {
    area: RecArea;
    mic: boolean;
    audioId: string;
    permissions: boolean;
  }): void;
  "popup:stop"(data: { mic: boolean; audioId: string }): void;
  "popup:check-status"(): void;
  "popup:get-audio-perm"(): void;
  "ort:settings"(data: { settings: Partial<Settings> }): void;

  // background -> popup (broadcasts; popup is often closed -> callers must catch)
  "popup:no-login"(): void;
  "popup:login"(): void;
  "popup:started"(): void;
  "popup:stopped"(): void;
  "popup:mic-status"(data: { status: boolean }): void;
  "popup:audio-perm"(): void;

  // content -> background
  "ort:countend"(data: { area: RecArea; mic: boolean; audioId: string }): boolean;
  "ort:stop"(): { status: string; duration?: number };
  "ort:getMicStatus"(): { micStatus: boolean };
  "ort:login-token"(data: { token: string; ingest: string }): void;
  "ort:invalidate-token"(): void;
  "ort:save-spot"(data: { spot: SpotMeta }): "pong";
  "ort:check-new-tab"(): boolean;
  "ort:started"(): void;
  "ort:stopped"(): void;
  "ort:restart"(): void;
  "ort:get-error-events"(): SpotErrorEvent[];
  "ort:mute-microphone"(): void;
  "ort:unmute-microphone"(): void;
  "ort:resume"(): void;
  "ort:pause"(): void;
  "ort:discard"(): void;
  "ort:bump-clicks"(data: { clicks: SpotClick[] }): "pong";
  "ort:bump-location"(data: { location: SpotLocation }): "pong";
  "ort:bump-vitals"(data: { vitals: Metric }): "pong";
  "ort:bump-logs"(data: { logs: SpotLog[] }): "pong";
  "ort:bump-network"(data: { event: SpotNetworkRequest }): "pong";

  // background -> content (sent with a tabId)
  "content:mount"(data: {
    area: RecArea;
    mic: boolean;
    audioId: string;
    audioPerm: 0 | 1 | 2;
  }): void;
  "content:start"(data: {
    microphone: boolean;
    time: number;
    slackChannels: { name: string; webhookId: number }[];
    activeTabId?: number | null;
    withConsole: boolean;
    withNetwork: boolean;
    state: string;
    shouldMount: boolean;
  }): void;
  "content:unmount"(): void;
  "content:stop"(): void;
  "notif:display"(data: { message: string }): void;
  "content:video-chunk"(data: {
    data: string;
    index: number;
    total: number;
    mtype: string;
  }): void;
  "content:spot-saved"(data: { url: string }): void;

  // background <-> offscreen
  "offscr:start-recording"(data: {
    data: string;
    area: RecArea;
    microphone: boolean;
    audioId: string;
  }): { success: boolean; time: number };
  "offscr:stop-recording"(): { status: string; duration?: number };
  "offscr:check-status"(): { status: boolean; time: number };
  "offscr:stop-discard"(): void;
  "offscr:pause-recording"(): void;
  "offscr:resume-recording"(): void;
  "offscr:mute-microphone"(): void;
  "offscr:unmute-microphone"(): void;
  // offscreen -> background
  "offscr:video-data-chunk"(data: {
    data: string;
    index: number;
    total: number;
    duration: number;
    mtype: string;
  }): void;

  // audio page -> background
  "audio:audio-perm"(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

/**
 * Broadcast to the popup, which is usually closed. @webext-core/messaging
 * rejects with "No response" when no listener exists, so swallow that here.
 */
export function notifyPopup<T extends keyof ProtocolMap>(
  type: T,
  ...args: Parameters<ProtocolMap[T]> extends [infer D] ? [D] : []
): void {
  // @ts-expect-error variadic forwarding of the optional data arg
  void sendMessage(type, args[0]).catch(() => {});
}
