export const LogLevel = {
  Verbose: 5,
  Log: 4,
  Warnings: 3,
  Errors: 2,
  Silent: 0,
} as const

export type ILogLevel = (typeof LogLevel)[keyof typeof LogLevel]

export default class Logger {
  private readonly level: ILogLevel

  constructor(debugLevel: ILogLevel = LogLevel.Silent) {
    this.level = debugLevel
  }

  private shouldLog(level: ILogLevel): boolean {
    return this.level >= level
  }

  log(...args: any[]) {
    if (this.shouldLog(LogLevel.Log)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console.log(...args)
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog(LogLevel.Warnings)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console.warn(...args)
    }
  }

  error(...args: any[]) {
    if (this.shouldLog(LogLevel.Errors)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console.error(...args)
    }
  }
}
