import { DEFAULT_SETTINGS } from "~/utils/storage";

/**
 * Hostnames that belong to the same OpenReplay deployment: the popup opens the
 * login page on app.openreplay.com even when the ingest point is
 * api.openreplay.com (see popup/Login.tsx getLink), and safeApiUrl() maps the
 * other way around for API calls.
 */
const HOST_ALIASES: Record<string, string> = {
  "api.openreplay.com": "app.openreplay.com",
  "app.openreplay.com": "api.openreplay.com",
};

/**
 * Origins allowed to hand the extension a login token. The ingest point is
 * extension-configured (settings default, or typed into popup Settings for a
 * self-hosted instance) and the popup only ever opens the login page there, so
 * it is the authoritative trusted origin. Every other page is third-party and
 * must not be able to swap the active credentials.
 */
export function trustedWebappOrigins(ingestPoint?: string): string[] {
  const raw = (ingestPoint ?? "").trim() || DEFAULT_SETTINGS.ingestPoint;
  let url: URL;
  try {
    url = new URL(raw);
  } catch (e) {
    return [];
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return [];
  const origins = [url.origin];
  const alias = HOST_ALIASES[url.hostname];
  if (alias) {
    const aliasUrl = new URL(url.toString());
    aliasUrl.hostname = alias;
    origins.push(aliasUrl.origin);
  }
  return origins;
}

export interface MessageSenderLike {
  origin?: string;
  url?: string;
  frameId?: number;
}

/**
 * Origin of the frame that sent a runtime message. Comes from the browser, so
 * unlike anything inside the message payload a page script cannot forge it.
 */
export function getSenderOrigin(sender?: MessageSenderLike): string | null {
  if (!sender) return null;
  // Opaque origins (sandboxed frames, about:blank) arrive as the string "null".
  if (sender.origin && sender.origin !== "null") return sender.origin;
  if (!sender.url) return null;
  try {
    const origin = new URL(sender.url).origin;
    return origin === "null" ? null : origin;
  } catch (e) {
    return null;
  }
}

/** True when a runtime message really came from the configured OpenReplay app. */
export function isTrustedWebappSender(
  sender: MessageSenderLike | undefined,
  ingestPoint?: string,
): boolean {
  // Top frame only; the content script is not registered for sub-frames.
  if (sender?.frameId != null && sender.frameId !== 0) return false;
  const origin = getSenderOrigin(sender);
  if (!origin) return false;
  return trustedWebappOrigins(ingestPoint).includes(origin);
}
