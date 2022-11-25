export enum LogLevel {
  INFO = 'info',
  LOG = 'log',
  WARNING = 'warning',
  WARN = 'warn',
  ERROR = 'error',
  EXCEPTION = 'exception',
}

interface ILog {
  level: LogLevel
  value: string
  time: number
  index?: number
  errorId?: string
}

export const Log = (log: ILog) => ({
  isRed: () => log.level === LogLevel.EXCEPTION || log.level === LogLevel.ERROR,
  isYellow: () => log.level === LogLevel.WARNING || log.level === LogLevel.WARN,
  ...log
})
