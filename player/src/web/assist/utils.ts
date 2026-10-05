import type { Socket } from './types';

type Handler = (...args: any[]) => void;

/** Subscribes all handlers; the returned function removes exactly these handlers. */
export function listen(
  socket: Socket,
  handlers: Record<string, Handler>,
): () => void {
  const entries = Object.entries(handlers);
  entries.forEach(([event, handler]) => socket.on(event, handler));
  return () => entries.forEach(([event, handler]) => socket.off(event, handler));
}

/**
 * Payload of a `{ meta, data }` envelope. The tracker wraps its events and the
 * assist server wraps unwrapped session events the same way (version 1 meta).
 */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'meta' in payload) {
    return (payload as unknown as { data: T }).data;
  }
  return payload as T;
}

export function createEmitter(
  socket: Socket,
  getAssistVersion: () => number,
  getTabId: () => string | undefined,
) {
  return (event: string, data?: any) => {
    if (getAssistVersion() === 1) {
      socket.emit(event, data);
    } else {
      socket.emit(event, { meta: { tabId: getTabId() }, data });
    }
  };
}

const SENSITIVE_QUERY_PARAMS = ['jwt', 'spotJwt'];

/** Agent location query without auth tokens; it is forwarded to the tracked user's page. */
export function safeQuery(search: string = document.location.search): string {
  const params = new URLSearchParams(search);
  if (!SENSITIVE_QUERY_PARAMS.some((key) => params.has(key))) {
    return search;
  }
  SENSITIVE_QUERY_PARAMS.forEach((key) => params.delete(key));
  const query = params.toString();
  return query ? `?${query}` : '';
}
