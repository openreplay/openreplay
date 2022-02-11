


export const LogLevel = {
  Verbose: 4,
  Errors: 4,
  Warnings: 3,
  Log: 2,
  Silent: 0,
} as const;
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
  level: LogLevel | CustomLevel,
  messages?: number[],
}


export type Options = true | _Options | LogLevel

export default class Logger {
  private readonly opts: _Options;
  constructor(private readonly options: Options = LogLevel.Silent) {
    this.opts = options === true 
      ? { level: LogLevel.Verbose } 
      : typeof options === "number" ? { level: options } : options;
  }
  log(...args: any) {
    if (IsCustomLevel(this.opts.level) 
      ? this.opts.level.log
      : this.opts.level >= LogLevel.Log) {
      console.log(...args)
    }
  }
  warn(...args: any) {
    if (IsCustomLevel(this.opts.level) 
      ? this.opts.level.warn
      : this.opts.level >= LogLevel.Warnings) {
      console.warn(...args)
    }
  }
  error(...args: any) {
    if (IsCustomLevel(this.opts.level) 
      ? this.opts.level.error
      : this.opts.level >= LogLevel.Errors) {
      console.error(...args)
    }
  }
}
