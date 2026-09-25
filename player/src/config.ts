export interface PlayerConfig {
  logger?: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    group?: (...args: any[]) => void;
    info?: (...args: any[]) => void;
  };
  efsClient?: {
    fetch: (path: string) => Promise<Response>;
    forceSiteId: (id: string) => void;
    setSiteIdCheck: (fn: () => any) => void;
  };
  getUserName?: () => string;
  getApiEndpoint?: () => string;
  /** Keeps raw messages and exposes debug hooks on window (see isPlayerDebug). */
  debug?: boolean;
}

let config: PlayerConfig = {};

export function configurePlayer(c: PlayerConfig) {
  config = c;
}

export function getPlayerConfig(): PlayerConfig {
  return config;
}

/** Debug features (raw message retention, window hooks) are opt-in. */
export function isPlayerDebug(): boolean {
  if (config.debug !== undefined) {
    return config.debug;
  }
  try {
    // @ts-ignore host dev-tools toggle (frontend/app/dev/console.js)
    return window.__OPENREPLAY_DEV_TOOLS__?.verbose === true;
  } catch {
    return false;
  }
}
