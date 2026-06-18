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
}

let config: PlayerConfig = {};

export function configurePlayer(c: PlayerConfig) {
  config = c;
}

export function getPlayerConfig(): PlayerConfig {
  return config;
}
