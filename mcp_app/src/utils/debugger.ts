import { App } from '@modelcontextprotocol/ext-apps/react';

type LogLevel = 'info' | 'error' | 'debug';

export interface Logger {
  info: (data: string) => Promise<void>;
  error: (data: string) => Promise<void>;
  debug: (data: string) => Promise<void>;
}

/**
 * Creates a logger instance for debugging UI issues
 * Sends logs to the host app (Claude) via app.sendLog
 */
export function createDebugger(app: App | null): Logger {
  const sendLog = async (level: LogLevel, data: string) => {
    if (!app) {
      console.warn('[Logger] App not initialized, falling back to console');
      console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}]`, data);
      return;
    }

    try {
      await app.sendLog({ level, data });
    } catch (err) {
      console.error('[Logger] Failed to send log:', err);
      console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}]`, data);
    }
  };

  return {
    info: (data: string) => sendLog('info', data),
    error: (data: string) => sendLog('error', data),
    debug: (data: string) => sendLog('debug', data),
  };
}
