export const LogLevel = {
  Verbose: 5,
  Log: 4,
  Warnings: 3,
  Errors: 2,
  Silent: 0,
} as const
type LogLevel = typeof LogLevel[keyof typeof LogLevel]

type CustomLevel = {
  error: boolean
  warn: boolean
  log: boolean
}

function IsCustomLevel(l: LogLevel | CustomLevel): l is CustomLevel {
  return typeof l === 'object'
}

interface _Options {
  level: LogLevel | CustomLevel
  messages?: number[]
}

export type Options = true | _Options | LogLevel

export default class Logger {
  private readonly options: _Options
  constructor(options: Options = LogLevel.Silent) {
    this.options =
      options === true
        ? { level: LogLevel.Verbose }
        : typeof options === 'number'
        ? { level: options }
        : options
  }
  log(...args: any) {
    if (
      IsCustomLevel(this.options.level)
        ? this.options.level.log
        : this.options.level >= LogLevel.Log
    ) {
      console.log(...args)
    }
  }
  warn(...args: any) {
    if (
      IsCustomLevel(this.options.level)
        ? this.options.level.warn
        : this.options.level >= LogLevel.Warnings
    ) {
      console.warn(...args)
    }
  }
  error(...args: any) {
    if (
      IsCustomLevel(this.options.level)
        ? this.options.level.error
        : this.options.level >= LogLevel.Errors
    ) {
      console.error(...args)
    }
  }
}
