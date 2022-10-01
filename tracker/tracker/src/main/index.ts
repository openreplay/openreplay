import App, { DEFAULT_INGEST_POINT } from './app/index.js'
export { default as App } from './app/index.js'

import { UserAnonymousID, RawCustomEvent, CustomIssue } from './app/messages.gen.js'
import * as _Messages from './app/messages.gen.js'
export const Messages = _Messages
export { SanitizeLevel } from './app/sanitizer.js'

import Connection from './modules/connection.js'
import Console from './modules/console.js'
import Exception, {
  getExceptionMessageFromEvent,
  getExceptionMessage,
} from './modules/exception.js'
import Img from './modules/img.js'
import Input from './modules/input.js'
import Mouse from './modules/mouse.js'
import Timing from './modules/timing.js'
import Performance from './modules/performance.js'
import Scroll from './modules/scroll.js'
import Viewport from './modules/viewport.js'
import CSSRules from './modules/cssrules.js'
import ConstructedStyleSheets from './modules/constructedStyleSheets.js'
import { IN_BROWSER, deprecationWarn, DOCS_HOST } from './utils.js'

import type { Options as AppOptions } from './app/index.js'
import type { Options as ConsoleOptions } from './modules/console.js'
import type { Options as ExceptionOptions } from './modules/exception.js'
import type { Options as InputOptions } from './modules/input.js'
import type { Options as PerformanceOptions } from './modules/performance.js'
import type { Options as TimingOptions } from './modules/timing.js'
import type { StartOptions } from './app/index.js'
//TODO: unique options init
import type { StartPromiseReturn } from './app/index.js'

export type Options = Partial<
  AppOptions & ConsoleOptions & ExceptionOptions & InputOptions & PerformanceOptions & TimingOptions
> & {
  projectID?: number // For the back compatibility only (deprecated)
  projectKey: string
  sessionToken?: string
  respectDoNotTrack?: boolean
  autoResetOnWindowOpen?: boolean
  // dev only
  __DISABLE_SECURE_MODE?: boolean
}

const DOCS_SETUP = '/installation/setup-or'

function processOptions(obj: any): obj is Options {
  if (obj == null) {
    console.error(
      `OpenReplay: invalid options argument type. Please, check documentation on ${DOCS_HOST}${DOCS_SETUP}`,
    )
    return false
  }
  if (typeof obj.projectKey !== 'string') {
    if (typeof obj.projectKey !== 'number') {
      if (typeof obj.projectID !== 'number') {
        // Back compatability
        console.error(
          `OpenReplay: projectKey is missing or wrong type (string is expected). Please, check ${DOCS_HOST}${DOCS_SETUP} for more information.`,
        )
        return false
      } else {
        obj.projectKey = obj.projectID.toString()
        deprecationWarn('`projectID` option', '`projectKey` option', DOCS_SETUP)
      }
    } else {
      console.warn('OpenReplay: projectKey is expected to have a string type.')
      obj.projectKey = obj.projectKey.toString()
    }
  }
  if (obj.sessionToken != null) {
    deprecationWarn('`sessionToken` option', '`sessionHash` start() option', '/')
  }
  return true
}

export default class API {
  private readonly app: App | null = null
  constructor(private readonly options: Options) {
    if (!IN_BROWSER || !processOptions(options)) {
      return
    }
    if ((window as any).__OPENREPLAY__) {
      console.error('OpenReplay: one tracker instance has been initialised already')
      return
    }
    if (!options.__DISABLE_SECURE_MODE && location.protocol !== 'https:') {
      console.error(
        'OpenReplay: Your website must be publicly accessible and running on SSL in order for OpenReplay to properly capture and replay the user session. You can disable this check by setting `__DISABLE_SECURE_MODE` option to `true` if you are testing in localhost. Keep in mind, that asset files on a local machine are not available to the outside world. This might affect tracking if you use css files.',
      )
      return
    }
    const doNotTrack =
      options.respectDoNotTrack &&
      (navigator.doNotTrack == '1' ||
        // @ts-ignore
        window.doNotTrack == '1')
    const app = (this.app =
      doNotTrack ||
      !('Map' in window) ||
      !('Set' in window) ||
      !('MutationObserver' in window) ||
      !('performance' in window) ||
      !('timing' in performance) ||
      !('startsWith' in String.prototype) ||
      !('Blob' in window) ||
      !('Worker' in window)
        ? null
        : new App(options.projectKey, options.sessionToken, options))
    if (app !== null) {
      Viewport(app)
      CSSRules(app)
      ConstructedStyleSheets(app)
      Connection(app)
      Console(app, options)
      Exception(app, options)
      Img(app)
      Input(app, options)
      Mouse(app)
      Timing(app, options)
      Performance(app, options)
      Scroll(app)
      ;(window as any).__OPENREPLAY__ = this

      if (options.autoResetOnWindowOpen) {
        const wOpen = window.open
        app.attachStartCallback(() => {
          // @ts-ignore ?
          window.open = function (...args) {
            app.resetNextPageSession(true)
            wOpen.call(window, ...args)
            app.resetNextPageSession(false)
          }
        })
        app.attachStopCallback(() => {
          window.open = wOpen
        })
      }
    } else {
      console.log(
        "OpenReplay: browser doesn't support API required for tracking or doNotTrack is set to 1.",
      )
      const req = new XMLHttpRequest()
      const orig = options.ingestPoint || DEFAULT_INGEST_POINT
      req.open('POST', orig + '/v1/web/not-started')
      // no-cors issue only with text/plain or not-set Content-Type
      // req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      req.send(
        JSON.stringify({
          trackerVersion: 'TRACKER_VERSION',
          projectKey: options.projectKey,
          doNotTrack,
          // TODO: add precise reason (an exact API missing)
        }),
      )
    }
  }

  use<T>(fn: (app: App | null, options?: Options) => T): T {
    return fn(this.app, this.options)
  }

  isActive(): boolean {
    if (this.app === null) {
      return false
    }
    return this.app.active()
  }

  start(startOpts?: Partial<StartOptions>): Promise<StartPromiseReturn> {
    if (!IN_BROWSER) {
      console.error(
        `OpenReplay: you are trying to start Tracker on a node.js environment. If you want to use OpenReplay with SSR, please, use componentDidMount or useEffect API for placing the \`tracker.start()\` line. Check documentation on ${DOCS_HOST}${DOCS_SETUP}`,
      )
      return Promise.reject('Trying to start not in browser.')
    }
    if (this.app === null) {
      return Promise.reject("Browser doesn't support required api, or doNotTrack is active.")
    }
    // TODO: check argument type
    return this.app.start(startOpts)
  }
  stop(): string | undefined {
    if (this.app === null) {
      return
    }
    this.app.stop()
    return this.app.session.getSessionHash()
  }

  getSessionToken(): string | null | undefined {
    if (this.app === null) {
      return null
    }
    return this.app.getSessionToken()
  }
  getSessionID(): string | null | undefined {
    if (this.app === null) {
      return null
    }
    return this.app.getSessionID()
  }
  sessionID(): string | null | undefined {
    deprecationWarn("'sessionID' method", "'getSessionID' method", '/')
    return this.getSessionID()
  }

  getSessionURL(): string | undefined {
    if (this.app === null) {
      return undefined
    }
    return this.app.getSessionURL()
  }

  setUserID(id: string): void {
    if (typeof id === 'string' && this.app !== null) {
      this.app.session.setUserID(id)
    }
  }
  userID(id: string): void {
    deprecationWarn("'userID' method", "'setUserID' method", '/')
    this.setUserID(id)
  }

  setUserAnonymousID(id: string): void {
    if (typeof id === 'string' && this.app !== null) {
      this.app.send(UserAnonymousID(id))
    }
  }
  userAnonymousID(id: string): void {
    deprecationWarn("'userAnonymousID' method", "'setUserAnonymousID' method", '/')
    this.setUserAnonymousID(id)
  }

  setMetadata(key: string, value: string): void {
    if (typeof key === 'string' && typeof value === 'string' && this.app !== null) {
      this.app.session.setMetadata(key, value)
    }
  }
  metadata(key: string, value: string): void {
    deprecationWarn("'metadata' method", "'setMetadata' method", '/')
    this.setMetadata(key, value)
  }

  event(key: string, payload: any, issue = false): void {
    if (typeof key === 'string' && this.app !== null) {
      if (issue) {
        return this.issue(key, payload)
      } else {
        try {
          payload = JSON.stringify(payload)
        } catch (e) {
          return
        }
        this.app.send(RawCustomEvent(key, payload))
      }
    }
  }

  issue(key: string, payload: any): void {
    if (typeof key === 'string' && this.app !== null) {
      try {
        payload = JSON.stringify(payload)
      } catch (e) {
        return
      }
      this.app.send(CustomIssue(key, payload))
    }
  }

  handleError = (e: Error | ErrorEvent | PromiseRejectionEvent) => {
    if (this.app === null) {
      return
    }
    if (e instanceof Error) {
      this.app.send(getExceptionMessage(e, []))
    } else if (
      e instanceof ErrorEvent ||
      ('PromiseRejectionEvent' in window && e instanceof PromiseRejectionEvent)
    ) {
      const msg = getExceptionMessageFromEvent(e)
      if (msg != null) {
        this.app.send(msg)
      }
    }
  }
}
