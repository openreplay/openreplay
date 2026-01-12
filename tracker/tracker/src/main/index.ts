import App from './app/index'

export { default as App } from './app/index.js'

import { UserAnonymousID, CustomEvent, CustomIssue, Incident } from './app/messages.gen.js'
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
import Focus from './modules/focus.js'
import Fonts from './modules/fonts.js'
import Network from './modules/network.js'
import ConstructedStyleSheets from './modules/constructedStyleSheets.js'
import Selection from './modules/selection.js'
import Tabs from './modules/tabs.js'
import LongAnimationTask from './modules/longAnimationTask.js'
import WebAnimations from './modules/webAnimations.js'
import AnalyticsSDK from './modules/analytics/index.js'

import { IN_BROWSER, deprecationWarn, DOCS_HOST, inIframe } from './utils.js'

import type { Options as AppOptions } from './app/index.js'
import type { Options as ConsoleOptions } from './modules/console.js'
import type { Options as ExceptionOptions } from './modules/exception.js'
import type { Options as InputOptions } from './modules/input.js'
import type { Options as PerformanceOptions } from './modules/performance.js'
import type { Options as TimingOptions } from './modules/timing.js'
import type { Options as NetworkOptions } from './modules/network.js'
import type { MouseHandlerOptions } from './modules/mouse.js'
import type { SessionInfo } from './app/session.js'
import type { CssRulesOptions } from './modules/cssrules.js'
import type { LATOptions } from './modules/longAnimationTask.js'
import type { Options as WapOptions } from './modules/webAnimations.js'
import type { Options as ViewportOptions } from './modules/viewport.js'

import type { StartOptions } from './app/index.js'
//TODO: unique options init
import type { StartPromiseReturn } from './app/index.js'

export type Options = Partial<
  AppOptions &
    ConsoleOptions &
    ExceptionOptions &
    InputOptions &
    PerformanceOptions &
    TimingOptions &
    LATOptions
> & {
  projectID?: number // For the back compatibility only (deprecated)
  projectKey: string
  sessionToken?: string
  respectDoNotTrack?: boolean
  autoResetOnWindowOpen?: boolean
  resetTabOnWindowOpen?: boolean
  network?: Partial<NetworkOptions>
  mouse?: Partial<MouseHandlerOptions>
  // dev only
  __DISABLE_SECURE_MODE?: boolean
  css: CssRulesOptions
  webAnimations?: WapOptions
  urls?: Partial<ViewportOptions>
  analytics?: {
    ingestPoint?: string
    active?: boolean
  }
}

const DOCS_SETUP = '/en/sdk'

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

const canAccessTop = () => {
  try {
    return Boolean(window.top?.document)
  } catch {
    return false
  }
}

export default class API {
  private readonly app: App | null = null
  public readonly analytics: AnalyticsSDK | null = null
  private readonly crossdomainMode: boolean = false

  constructor(public readonly options: Partial<Options>) {
    this.crossdomainMode = Boolean(inIframe() && options.crossdomain?.enabled)
    if (!IN_BROWSER || !processOptions(options)) {
      return
    }
    if (
      (window as any).__OPENREPLAY__ ||
      (!this.crossdomainMode && inIframe() && canAccessTop() && (window.top as any).__OPENREPLAY__)
    ) {
      console.error('OpenReplay: one tracker instance has been initialised already')
      return
    }
    if (!options.__DISABLE_SECURE_MODE && location.protocol !== 'https:') {
      console.error(
        'OpenReplay: Your website must be publicly accessible and running on SSL in order for OpenReplay to properly capture and replay the user session. You can disable this check by setting `__DISABLE_SECURE_MODE` option to `true` if you are testing in localhost. Keep in mind, that asset files on a local machine are not available to the outside world. This might affect tracking if you use css files.',
      )
      return
    }
    const doNotTrack = this.checkDoNotTrack()
    const failReason: string[] = []
    const conditions: string[] = [
      'Map',
      'Set',
      'MutationObserver',
      'performance',
      'timing',
      'startsWith',
      'Blob',
      'Worker',
    ]

    if (doNotTrack) {
      failReason.push('doNotTrack')
    } else {
      for (const condition of conditions) {
        if (condition === 'timing') {
          if ('performance' in window && !(condition in performance)) {
            failReason.push(condition)
            break
          }
        } else if (condition === 'startsWith') {
          if (!(condition in String.prototype)) {
            failReason.push(condition)
            break
          }
        } else {
          if (!(condition in window)) {
            failReason.push(condition)
            break
          }
        }
      }
    }
    if (failReason.length > 0) {
      const missingApi = failReason.join(',')
      console.error(
        `OpenReplay: browser doesn't support API required for tracking or doNotTrack is set to 1. Reason: ${missingApi}`,
      )
      this.signalStartIssue('missing_api', failReason)
      return
    }

    const app = new App(
      options.projectKey,
      options.sessionToken,
      options,
      this.signalStartIssue,
      this.crossdomainMode,
    )
    this.app = app
    if (options.projectKey && options.analytics?.active) {
      let isSaas = false;
      if (!options.ingestPoint) {
        isSaas = true;
      }
      if (options.ingestPoint) {
        const saasHost = 'api.openreplay.com';
        const urlObj = new URL(options.ingestPoint);
        if (urlObj.hostname === saasHost) {
          isSaas = true;
        }
      }
      const defaultEdp = 'https://api.openreplay.com/ingest'
      this.analytics = new AnalyticsSDK({
        localStorage: options.localStorage ?? localStorage,
        sessionStorage: options.sessionStorage ?? sessionStorage,
        getToken: () => this.getAnalyticsToken(),
        getTimestamp: () => this.app?.timestamp() ?? Date.now(),
        setUserId: (id) => {
          this.app?.session.setUserID(id)
        },
        notStandalone: true,
        ingestPoint: isSaas
          ? defaultEdp
          : (options.analytics?.ingestPoint ?? options.ingestPoint ?? defaultEdp),
        projectKey: options.projectKey,
      })
    }
    if (!this.crossdomainMode) {
      // no need to send iframe viewport data since its a node for us
      Viewport(app, options.urls)
      // calculated in main window
      Connection(app)
      // while we can calculate it here, trying to compute it for all parts is hard
      Performance(app, options)
      // no tabs in iframes yet
      Tabs(app)
    }
    Mouse(app, options.mouse)
    // inside iframe, we ignore viewport scroll
    Scroll(app, this.crossdomainMode)
    CSSRules(app, options.css)
    ConstructedStyleSheets(app)
    Console(app, options)
    Exception(app, options)
    Img(app)
    Input(app, options)
    Timing(app, options)
    LongAnimationTask(app, options)
    Focus(app)
    Fonts(app)
    const skipNetwork = options.network?.disabled
    if (!skipNetwork) {
      Network(app, options.network)
    }
    Selection(app)
    WebAnimations(app, options.webAnimations)
    ;(window as any).__OPENREPLAY__ = this

    const wOpen = window.open
    if (options.autoResetOnWindowOpen || options.resetTabOnWindowOpen) {
      app.attachStartCallback(() => {
        const tabId = app.getTabId()
        const sessStorage = app.sessionStorage ?? window.sessionStorage
        window.open = function (...args) {
          if (options.autoResetOnWindowOpen) {
            app.resetNextPageSession(true)
          }
          if (options.resetTabOnWindowOpen) {
            sessStorage.removeItem(options.session_tabid_key || '__openreplay_tabid')
          }
          app.resetNextPageSession(false)
          sessStorage.setItem(options.session_tabid_key || '__openreplay_tabid', tabId)
          return wOpen.call(window, ...args)
        }
      })
      app.attachStopCallback(() => {
        window.open = wOpen
      })
    }
  }

  checkDoNotTrack = () => {
    return (
      this.options.respectDoNotTrack &&
      (navigator.doNotTrack == '1' ||
        // @ts-ignore
        window.doNotTrack == '1')
    )
  }

  signalStartIssue = (reason: string, missingApi: string[]) => {
    const doNotTrack = this.checkDoNotTrack()
    console.log(
      "Tracker couldn't start due to:",
      JSON.stringify({
        trackerVersion: 'TRACKER_VERSION',
        projectKey: this.options.projectKey,
        doNotTrack,
        reason: missingApi.length ? `missing api: ${missingApi.join(',')}` : reason,
      }),
    )
  }

  public restartCanvasTracking = () => {
    if (this.app === null) {
      return
    }
    this.app.restartCanvasTracking()
  }

  use<T>(fn: (app: App | null, options?: Partial<Options>) => T): T {
    return fn(this.app, this.options)
  }

  isActive(): boolean {
    if (this.app === null) {
      return false
    }
    return this.app.active()
  }

  /**
   * Creates a named hook that expects event name, data string and msg direction (up/down),
   * it will skip any message bigger than 5 mb or event name bigger than 255 symbols
   * msg direction is "down" (incoming) by default
   *
   * @returns {(msgType: string, data: string, dir: 'up' | 'down') => void}
   * */
  trackWs(channelName: string) {
    if (this.app === null) {
      return
    }
    return this.app.trackWs(channelName)
  }

  start(startOpts?: Partial<StartOptions>): Promise<StartPromiseReturn> {
    if (this.browserEnvCheck()) {
      if (this.app === null) {
        return Promise.reject("Browser doesn't support required api, or doNotTrack is active.")
      }
      if (startOpts?.userID) {
        this.app.session.setUserID(startOpts.userID);
        this.analytics?.people.identify(startOpts.userID, { fromTracker: true })
      }
      return this.app.start(startOpts)
    } else {
      return Promise.reject('Trying to start not in browser.')
    }
  }

  browserEnvCheck() {
    if (!IN_BROWSER) {
      console.error(
        `OpenReplay: you are trying to start Tracker on a node.js environment. If you want to use OpenReplay with SSR, please, use componentDidMount or useEffect API for placing the \`tracker.start()\` line. Check documentation on ${DOCS_HOST}${DOCS_SETUP}`,
      )
      return false
    }
    return true
  }

  /**
   * start buffering messages without starting the actual session, which gives user 30 seconds to "activate" and record
   * session by calling start() on conditional trigger and we will then send buffered batch, so it won't get lost
   * */
  coldStart(startOpts?: Partial<StartOptions>, conditional?: boolean) {
    if (this.browserEnvCheck()) {
      if (this.app === null) {
        return Promise.reject('Tracker not initialized')
      }
      void this.app.coldStart(startOpts, conditional)
    } else {
      return Promise.reject('Trying to start not in browser.')
    }
  }

  /**
   * Starts offline session recording. Keep in mind that only user device time will be used for timestamps.
   * (no backend delay sync)
   *
   * @param {Object} startOpts - options for session start, same as .start()
   * @param {Function} onSessionSent - callback that will be called once session is fully sent
   * @returns methods to manipulate buffer:
   *
   * saveBuffer - to save it in localStorage
   *
   * getBuffer - returns current buffer
   *
   * setBuffer - replaces current buffer with given
   * */
  startOfflineRecording(startOpts: Partial<StartOptions>, onSessionSent: () => void) {
    if (this.browserEnvCheck()) {
      if (this.app === null) {
        return Promise.reject('Tracker not initialized')
      }
      return this.app.offlineRecording(startOpts, onSessionSent)
    } else {
      return Promise.reject('Trying to start not in browser.')
    }
  }

  /**
   * Uploads the stored session buffer to backend
   * @returns promise that resolves once messages are loaded, it has to be awaited
   * so the session can be uploaded properly
   * @resolve - if messages were loaded into service worker successfully
   * @reject {string} - error message
   * */
  uploadOfflineRecording() {
    if (this.app === null) {
      return
    }
    return this.app.uploadOfflineRecording()
  }

  stop(): string | undefined {
    if (this.app === null) {
      return
    }
    this.app.stop()
    return this.app.session.getSessionHash()
  }

  forceFlushBatch() {
    if (this.app === null) {
      return
    }
    this.app.forceFlushBatch()
  }

  getSessionToken(): string | null | undefined {
    if (this.app === null) {
      return null
    }
    return this.app.getSessionToken()
  }

  getSessionInfo(): SessionInfo | null {
    if (this.app === null) {
      return null
    }
    return this.app.session.getInfo()
  }

  getSessionID(): string | null | undefined {
    if (this.app === null) {
      return null
    }
    return this.app.getSessionID()
  }

  getTabId() {
    if (this.app === null) {
      return null
    }
    return this.app.getTabId()
  }

  sessionID(): string | null | undefined {
    deprecationWarn("'sessionID' method", "'getSessionID' method", '/')
    return this.getSessionID()
  }

  getSessionURL = (options?: { withCurrentTime?: boolean }): string | undefined => {
    if (this.app === null) {
      return undefined
    }
    return this.app.getSessionURL(options)
  }

  setUserID = (id: string): void => {
    if (typeof id === 'string' && this.app !== null) {
      this.app.session.setUserID(id)
      this.analytics?.people.identify(id, { fromTracker: true })
    }
  }

  identify = this.setUserID
  track = this.analytics?.track

  userID = (id: string): void => {
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

  event(key: string, payload: any = null, issue = false): void {
    if (typeof key === 'string' && this.app !== null) {
      if (issue) {
        return this.issue(key, payload)
      } else {
        if (!payload || typeof payload === 'string') {
          return this.app.send(CustomEvent(key, payload))
        }
        try {
          if ('or_timestamp' in payload) {
            const startTs = this.getSessionInfo()?.timestamp ?? 0
            const diff = payload.or_timestamp - startTs
            if (diff < 0) {
              console.error(
                `OpenReplay: event ${key} has or_timestamp (${payload.or_timestamp}) before session start (${startTs}). It will be ignored.`,
              )
            }
          }
          payload = JSON.stringify(payload)
        } catch (_) {}
        this.app.send(CustomEvent(key, payload))
      }
    }
  }

  issue(key: string, payload: any = null): void {
    if (typeof key === 'string' && this.app !== null) {
      try {
        payload = JSON.stringify(payload)
      } catch (e) {
        return
      }
      this.app.send(CustomIssue(key, payload))
    }
  }

  handleError = (
    e: Error | ErrorEvent | PromiseRejectionEvent,
    metadata: Record<string, any> = {},
  ) => {
    if (this.app === null) {
      return
    }
    if (e instanceof Error) {
      const msg = getExceptionMessage(e, [], metadata)
      this.app.send(msg)
    } else if (
      e instanceof ErrorEvent ||
      ('PromiseRejectionEvent' in window && e instanceof PromiseRejectionEvent)
    ) {
      const msg = getExceptionMessageFromEvent(e, undefined, metadata)
      if (msg != null) {
        this.app.send(msg)
      }
    }
  }

  incident = (options: { label?: string; startTime: number; endTime?: number }) => {
    if (this.app === null) {
      return
    }
    this.app.send(
      Incident(options.label ?? '', options.startTime, options.endTime ?? options.startTime),
    )
  }

  private analyticsToken: string | null = null
  /**
   * Use custom token for analytics events without session recording
   * */
  public setAnalyticsToken = (token: string) => {
    this.analyticsToken = token
  }
  public getAnalyticsToken = () => {
    if (this.analyticsToken) {
      return this.analyticsToken
    } else {
      return this.app?.session.getSessionToken() ?? ''
    }
  }
}
