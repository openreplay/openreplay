export enum LogLevel {
  INFO = 'info',
  LOG = 'log',
  // ASSERT = 'assert', //?
  WARN = 'warn',
  ERROR = 'error',
  EXCEPTION = 'exception',
}

export interface ILog {
  content: string;
  severity: 'info' | 'log' | 'warn' | 'error' | 'exception';
  time: number;
  timestamp: number;
  tp: number;
  _index?: number;
}

export const Log = (log: ILog) => ({
  isRed: log.severity === LogLevel.EXCEPTION || log.severity === LogLevel.ERROR,
  isYellow: log.severity === LogLevel.WARN,
  value: log.content,
  level: log.severity,
  ...log,
});
