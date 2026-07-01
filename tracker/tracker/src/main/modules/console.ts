import type App from '../app/index.js'
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
    const res: string[] = []
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

  const sendConsoleLog = app.safe((level: string, args: unknown[]): void => {
    let logMsg = printf(args)
    if (app.sanitizer.privateMode) {
      logMsg = logMsg.replaceAll(/./g, '*')
    }
    app.send(ConsoleLog(level, logMsg))
  })

  let n = 0
  const reset = (): void => {
    n = 0
  }
  app.attachStartCallback(reset)
  app.ticker.attach(reset, 33, false)

  // Restorers for every method we patch, so we can put the host's console back
  // when the session stops instead of leaving it proxied for the page's lifetime.
  const restores: Array<() => void> = []

  const patchConsole = (console: Console, ctx: typeof globalThis) => {
    const handler = {
      apply: function (target: Console['log'], thisArg: typeof this, argumentsList: unknown[]) {
        Reflect.apply(target, ctx, argumentsList)
        n = n + 1
        if (n > options.consoleThrottling) {
          return
        } else {
          sendConsoleLog(target.name, argumentsList)
        }
      },
    }

    options.consoleMethods!.forEach((method) => {
      if (consoleMethods.indexOf(method) === -1) {
        app.debug.error(`OpenReplay: unsupported console method "${method}"`)
        return
      }
      const fn = (ctx.console as any)[method]
      // is there any way to preserve the original console trace?
      ;(console as any)[method] = new Proxy(fn, handler)
      restores.push(() => {
        ;(console as any)[method] = fn
      })
    })
  }

  const patchContext = app.safe((context: typeof globalThis) =>
    patchConsole(context.console, context),
  )

  let patched = false
  const startPatching = () => {
    if (patched) {
      return
    }
    patched = true
    patchContext(window)
  }
  // Patch immediately, and re-patch on any later start; restore on stop so the
  // host console isn't left wrapped for the page's lifetime and capture is
  // re-established symmetrically across a stop/restart.
  startPatching()
  app.attachStartCallback(startPatching)
  app.attachStopCallback(() => {
    patched = false
    restores.forEach((restore) => restore())
    restores.length = 0
  })
  app.observer.attachContextCallback(patchContext)
}
