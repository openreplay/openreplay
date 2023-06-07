export const enum LogLevel {
  INFO = 'info',
  LOG = 'log',
  //ASSERT = 'assert', //?
  WARN = 'warn',
  ERROR = 'error',
  EXCEPTION = 'exception',
} 

export interface ILog {
  level: LogLevel
  value: string
  time: number
  index?: number
  errorId?: string
  tabId?: string
}

export const Log = (log: ILog) => ({
  isRed: log.level === LogLevel.EXCEPTION || log.level === LogLevel.ERROR,
  isYellow: log.level === LogLevel.WARN,
  ...log
})

