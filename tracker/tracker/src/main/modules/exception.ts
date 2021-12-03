import App from "../app/index.js";
import { JSException } from "../../messages/index.js";
import Message from "../../messages/message.js";
import ErrorStackParser from 'error-stack-parser';

export interface Options {
  captureExceptions: boolean;
}

interface StackFrame {
  columnNumber?: number,
  lineNumber?: number,
  fileName?: string,
  functionName?: string,
  source?: string,
}

function getDefaultStack(e: ErrorEvent): Array<StackFrame> {
  return [{
    columnNumber: e.colno,
    lineNumber: e.lineno,
    fileName: e.filename,
    functionName: "",
    source: "",
  }];
}

export function getExceptionMessage(error: Error, fallbackStack: Array<StackFrame>): Message {
  let stack = fallbackStack;
  try {
    stack = ErrorStackParser.parse(error);
  } catch (e) {
  }
  return new JSException(error.name, error.message, JSON.stringify(stack));
}

export function getExceptionMessageFromEvent(e: ErrorEvent | PromiseRejectionEvent): Message | null {
  if (e instanceof ErrorEvent) {
    if (e.error instanceof Error) {
      return getExceptionMessage(e.error, getDefaultStack(e))
    } else {
      let [name, message] = e.message.split(':');
      if (!message) {
        name = 'Error';
        message = e.message
      }
      return new JSException(name, message, JSON.stringify(getDefaultStack(e)));
    }
  } else if ('PromiseRejectionEvent' in window && e instanceof PromiseRejectionEvent) {
    if (e.reason instanceof Error) {
      return getExceptionMessage(e.reason, [])
    } else {
      return new JSException('Unhandled Promise Rejection', String(e.reason), '[]');
    }
  }
  return null;
}


export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      captureExceptions: true,
    },
    opts,
  );
  if (options.captureExceptions) {
    const handler = (e: ErrorEvent | PromiseRejectionEvent): void => {
      const msg = getExceptionMessageFromEvent(e);
      if (msg != null) {
        app.send(msg);
      }
    }

    app.attachEventListener(
      window,
      'unhandledrejection',
      (e: PromiseRejectionEvent): void => handler(e),
    );
    app.attachEventListener(
      window,
      'error',
      (e: ErrorEvent): void => handler(e),
    );
  }
}
