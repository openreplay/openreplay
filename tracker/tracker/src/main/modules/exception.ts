import type App from '../app/index.js'
import type Message from '../app/messages.gen.js'
import { JSException } from '../app/messages.gen.js'
import ErrorStackParser from 'error-stack-parser'

export interface Options {
  captureExceptions: boolean
}

interface StackFrame {
  columnNumber?: number
  lineNumber?: number
  fileName?: string
  functionName?: string
  source?: string
}

function getDefaultStack(e: ErrorEvent): Array<StackFrame> {
  return [
    {
      columnNumber: e.colno,
      lineNumber: e.lineno,
      fileName: e.filename,
      functionName: '',
      source: '',
    },
  ]
}

export function getExceptionMessage(
  error: Error,
  fallbackStack: Array<StackFrame>,
  metadata: Record<string, any> = {},
): Message {
  let stack = fallbackStack
  try {
    stack = ErrorStackParser.parse(error)
  } catch (e) {}
  return JSException(error.name, error.message, JSON.stringify(stack), JSON.stringify(metadata))
}

export function getExceptionMessageFromEvent(
  e: ErrorEvent | PromiseRejectionEvent,
  context: typeof globalThis = window,
  metadata: Record<string, any> = {},
): Message | null {
  if (e instanceof ErrorEvent) {
    if (e.error instanceof Error) {
      return getExceptionMessage(e.error, getDefaultStack(e), metadata)
    } else {
      let [name, message] = e.message.split(':')
      if (!message) {
        name = 'Error'
        message = e.message
      }
      return JSException(
        name,
        message,
        JSON.stringify(getDefaultStack(e)),
        JSON.stringify(metadata),
      )
    }
  } else if ('PromiseRejectionEvent' in context && e instanceof context.PromiseRejectionEvent) {
    if (e.reason instanceof Error) {
      return getExceptionMessage(e.reason, [], metadata)
    } else {
      let message: string
      try {
        message = JSON.stringify(e.reason)
      } catch (_) {
        message = String(e.reason)
      }
      return JSException('Unhandled Promise Rejection', message, '[]', JSON.stringify(metadata))
    }
  }
  return null
}

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      captureExceptions: true,
    },
    opts,
  )
  function patchContext(context: Window & typeof globalThis) {
    function handler(e: ErrorEvent | PromiseRejectionEvent): void {
      const msg = getExceptionMessageFromEvent(e, context)
      if (msg != null) {
        app.send(msg)
      }
    }
    app.attachEventListener(context, 'unhandledrejection', handler)
    app.attachEventListener(context, 'error', handler)
  }
  if (options.captureExceptions) {
    app.observer.attachContextCallback(patchContext) // TODO: attach once-per-iframe (?)
    patchContext(window)
  }
}
