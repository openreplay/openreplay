import type App from '../app/index.js'
import { hasTag } from '../app/guards.js'
import { IN_BROWSER } from '../utils.js'
import { ConsoleLog } from '../app/messages.gen.js'

const printError: (e: Error) => string =
  IN_BROWSER && 'InstallTrigger' in window // detect Firefox
    ? (e: Error): string => e.message + '\n' + e.stack
    : (e: Error): string => e.stack || e.message

function printString(arg: any): string {
  if (arg === undefined) {
    return 'undefined'
  }
  if (arg === null) {
    return 'null'
  }
  if (arg instanceof Error) {
    return printError(arg)
  }
  if (Array.isArray(arg)) {
    return `Array(${arg.length})`
  }
  return String(arg)
}

function printFloat(arg: any): string {
  if (typeof arg !== 'number') return 'NaN'
  return arg.toString()
}

function printInt(arg: any): string {
  if (typeof arg !== 'number') return 'NaN'
  return Math.floor(arg).toString()
}

function printObject(arg: any): string {
  if (arg === undefined) {
    return 'undefined'
  }
  if (arg === null) {
    return 'null'
  }
  if (arg instanceof Error) {
    return printError(arg)
  }
  if (Array.isArray(arg)) {
    const length = arg.length
    const values = arg.slice(0, 10).map(printString).join(', ')
    return `Array(${length})[${values}]`
  }
  if (typeof arg === 'object') {
    const res = []
    let i = 0
    for (const k in arg) {
      if (++i === 10) {
        break
      }
      const v = arg[k]
      res.push(k + ': ' + printString(v))
    }
    return '{' + res.join(', ') + '}'
  }
  return arg.toString()
}

function printf(args: any[]): string {
  if (typeof args[0] === 'string') {
    args.unshift(
      args.shift().replace(/%(o|s|f|d|i)/g, (s: string, t: string): string => {
        const arg = args.shift()
        if (arg === undefined) return s
        switch (t) {
          case 'o':
            return printObject(arg)
          case 's':
            return printString(arg)
          case 'f':
            return printFloat(arg)
          case 'd':
          case 'i':
            return printInt(arg)
          default:
            return s
        }
      }),
    )
  }
  return args.map(printObject).join(' ')
}

export interface Options {
  consoleMethods: Array<string> | null
  consoleThrottling: number
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'assert']

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      consoleMethods,
      consoleThrottling: 30,
    },
    opts,
  )
  if (!Array.isArray(options.consoleMethods) || options.consoleMethods.length === 0) {
    return
  }

  const sendConsoleLog = app.safe((level: string, args: unknown[]): void =>
    app.send(ConsoleLog(level, printf(args))),
  )

  let n: number
  const reset = (): void => {
    n = 0
  }
  app.attachStartCallback(reset)
  app.ticker.attach(reset, 33, false)

  const patchConsole = (console: Console) =>
    options.consoleMethods!.forEach((method) => {
      if (consoleMethods.indexOf(method) === -1) {
        app.debug.error(`OpenReplay: unsupported console method "${method}"`)
        return
      }
      const fn = (console as any)[method]
      ;(console as any)[method] = function (...args: unknown[]): void {
        fn.apply(this, args)
        if (n++ > options.consoleThrottling) {
          return
        }
        sendConsoleLog(method, args)
      }
    })
  const patchContext = app.safe((context: typeof globalThis) => patchConsole(context.console))

  patchContext(window)
  app.observer.attachContextCallback(patchContext)
}
