import { useSyncExternalStore } from 'react';

/**
 * The replay queue: the sessions you have open, in the order they arrived, kept
 * outside React and in sessionStorage so it survives moving between the list
 * and a replay and a reload of this tab, and is gone with the browser tab.
 * Opening a replay adds it; a row's "Add to queue" adds one without opening it.
 * Each entry is a snapshot of what the dock draws, so a queued session never
 * has to be on the current page of the list.
 */
const KEY = '__or_open_sessions';

export interface QueuedSession {
  id: string;
  /** the project it belongs to, so a tab opens under the right site */
  siteId: string;
  name: string;
  anonymous: boolean;
  /** `userNumericHash`: the avatar's glyph and hue */
  seed: number;
  metadata: Record<string, string | null>;
}

let queue: readonly QueuedSession[] = read();
const listeners = new Set<() => void>();
/* Arrivals, for the dock's landing pill: an event, so a remount or a reload never replays one. */
const landingListeners = new Set<(s: QueuedSession) => void>();

function read(): QueuedSession[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v)
      ? v.filter((x): x is QueuedSession => typeof x?.id === 'string')
      : [];
  } catch {
    return [];
  }
}

function write(next: readonly QueuedSession[]): void {
  queue = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private window: the queue still works for this visit */
  }
  listeners.forEach((l) => l());
}

/** The fields of a list row or the replay's session the dock needs. */
export function snapshotOf(
  s: {
    sessionId: string;
    userDisplayName?: string;
    userId?: string;
    userNumericHash?: number;
    metadata?: Record<string, any>;
  },
  siteId: string,
): QueuedSession {
  return {
    id: s.sessionId,
    siteId,
    name: s.userDisplayName || s.userId || 'Anonymous',
    anonymous: !s.userId,
    seed: s.userNumericHash ?? 0,
    metadata: capMeta(s.metadata),
  };
}

/* The dock shows a couple of chips; the whole metadata of every queued session
   in sessionStorage could hit the quota and silently stop persisting. */
const META_KEYS = 3;
const META_CHARS = 120;
function capMeta(
  meta: Record<string, any> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta ?? {}).slice(0, META_KEYS)) {
    out[k] = String(v ?? '').slice(0, META_CHARS);
  }
  return out;
}

/** Adds a session at the end. Already there: nothing changes and nothing lands. */
export function openSessionTab(s: QueuedSession): void {
  if (queue.some((q) => q.id === s.id)) return;
  write([...queue, s]);
  landingListeners.forEach((l) => l(s));
}

export function closeSessionTab(id: string): void {
  if (!queue.some((q) => q.id === id)) return;
  write(queue.filter((q) => q.id !== id));
}

export function clearSessionTabs(): void {
  if (queue.length) write([]);
}

/** The tab beside a closing one: the one after it, else the one before. */
export function neighbourOf(id: string): QueuedSession | null {
  const i = queue.findIndex((q) => q.id === id);
  if (i < 0) return null;
  return queue[i + 1] ?? queue[i - 1] ?? null;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useOpenSessions(): readonly QueuedSession[] {
  return useSyncExternalStore(subscribe, () => queue);
}

export function onLanding(l: (s: QueuedSession) => void): () => void {
  landingListeners.add(l);
  return () => {
    landingListeners.delete(l);
  };
}

/** The `queue` a sessions table takes: "Add to queue" on hover, the check when queued. */
export function useSessionQueue(siteId: string) {
  const rows = useOpenSessions();
  return {
    has: (id: string) => rows.some((q) => q.id === id),
    onAdd: (s: Parameters<typeof snapshotOf>[0]) =>
      openSessionTab(snapshotOf(s, siteId)),
    onRemove: (s: { sessionId: string }) => closeSessionTab(s.sessionId),
  };
}
