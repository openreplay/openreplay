import type Message from './messages.gen.js'
import { Timestamp, Metadata, UserID } from './messages.gen.js'
import { timestamp as now, deprecationWarn } from '../utils.js'
import Nodes from './nodes.js'
import Observer from './observer/top_observer.js'
import Sanitizer from './sanitizer.js'
import Ticker from './ticker.js'
import Logger, { LogLevel } from './logger.js'
import Session from './session.js'

import { deviceMemory, jsHeapSizeLimit } from '../modules/performance.js'

import type { Options as ObserverOptions } from './observer/top_observer.js'
import type { Options as SanitizerOptions } from './sanitizer.js'
import type { Options as LoggerOptions } from './logger.js'
import type { Options as SessOptions } from './session.js'
import type { Options as WebworkerOptions, WorkerMessageData } from '../../common/interaction.js'

// TODO: Unify and clearly describe options logic
export interface StartOptions {
  userID?: string
  metadata?: Record<string, string>
  forceNew?: boolean
  sessionHash?: string
}

interface OnStartInfo {
  sessionID: string
  sessionToken: string
  userUUID: string
}
const CANCELED = 'canceled' as const
const START_ERROR = ':(' as const
type SuccessfulStart = OnStartInfo & { success: true }
type UnsuccessfulStart = {
  reason: typeof CANCELED | string
  success: false
}
const UnsuccessfulStart = (reason: string): UnsuccessfulStart => ({ reason, success: false })
const SuccessfulStart = (body: OnStartInfo): SuccessfulStart => ({ ...body, success: true })
export type StartPromiseReturn = SuccessfulStart | UnsuccessfulStart

type StartCallback = (i: OnStartInfo) => void
type CommitCallback = (messages: Array<Message>) => void
enum ActivityState {
  NotActive,
  Starting,
  Active,
}

type AppOptions = {
  revID: string
  node_id: string
  session_reset_key: string
  session_token_key: string
  session_pageno_key: string
  local_uuid_key: string
  ingestPoint: string
  resourceBaseHref: string | null // resourceHref?
  //resourceURLRewriter: (url: string) => string | boolean,
  verbose: boolean
  __is_snippet: boolean
  __debug_report_edp: string | null
  __debug__?: LoggerOptions
  localStorage: Storage | null
  sessionStorage: Storage | null

  // @deprecated
  onStart?: StartCallback
} & WebworkerOptions &
  SessOptions

export type Options = AppOptions & ObserverOptions & SanitizerOptions

// TODO: use backendHost only
export const DEFAULT_INGEST_POINT = 'https://api.openreplay.com/ingest'

export default class App {
  readonly nodes: Nodes
  readonly ticker: Ticker
  readonly projectKey: string
  readonly sanitizer: Sanitizer
  readonly debug: Logger
  readonly notify: Logger
  readonly session: Session
  readonly localStorage: Storage
  readonly sessionStorage: Storage
  private readonly messages: Array<Message> = []
  /* private */ readonly observer: Observer // non-privat for attachContextCallback
  private readonly startCallbacks: Array<StartCallback> = []
  private readonly stopCallbacks: Array<() => any> = []
  private readonly commitCallbacks: Array<CommitCallback> = []
  private readonly options: AppOptions
  private readonly revID: string
  private activityState: ActivityState = ActivityState.NotActive
  private readonly version = 'TRACKER_VERSION' // TODO: version compatability check inside each plugin.
  private readonly worker?: Worker
  constructor(projectKey: string, sessionToken: string | undefined, options: Partial<Options>) {
    // if (options.onStart !== undefined) {
    //   deprecationWarn("'onStart' option", "tracker.start().then(/* handle session info */)")
    // } ?? maybe onStart is good

    this.projectKey = projectKey
    this.options = Object.assign(
      {
        revID: '',
        node_id: '__openreplay_id',
        session_token_key: '__openreplay_token',
        session_pageno_key: '__openreplay_pageno',
        session_reset_key: '__openreplay_reset',
        local_uuid_key: '__openreplay_uuid',
        ingestPoint: DEFAULT_INGEST_POINT,
        resourceBaseHref: null,
        verbose: false,
        __is_snippet: false,
        __debug_report_edp: null,
        localStorage: window?.localStorage,
        sessionStorage: window?.sessionStorage,
      },
      options,
    )

    this.revID = this.options.revID
    this.sanitizer = new Sanitizer(this, options)
    this.nodes = new Nodes(this.options.node_id)
    this.observer = new Observer(this, options)
    this.ticker = new Ticker(this)
    this.ticker.attach(() => this.commit())
    this.debug = new Logger(this.options.__debug__)
    this.notify = new Logger(this.options.verbose ? LogLevel.Warnings : LogLevel.Silent)
    this.localStorage = this.options.localStorage || window.localStorage
    this.sessionStorage = this.options.sessionStorage || window.sessionStorage
    this.session = new Session(this, this.options)
    this.session.attachUpdateCallback(({ userID, metadata }) => {
      if (userID != null) {
        // TODO: nullable userID
        this.send(UserID(userID))
      }
      if (metadata != null) {
        Object.entries(metadata).forEach(([key, value]) => this.send(Metadata(key, value)))
      }
    })

    // @depricated (use sessionHash on start instead)
    if (sessionToken != null) {
      this.session.applySessionHash(sessionToken)
    }

    try {
      this.worker = new Worker(
        URL.createObjectURL(new Blob(['WEBWORKER_BODY'], { type: 'text/javascript' })),
      )
      this.worker.onerror = (e) => {
        this._debug('webworker_error', e)
      }
      this.worker.onmessage = ({ data }: MessageEvent) => {
        if (data === 'failed') {
          this.stop(false)
          this._debug('worker_failed', {}) // add context (from worker)
        } else if (data === 'restart') {
          this.stop(false)
          this.start({ forceNew: true })
        }
      }
      const alertWorker = () => {
        if (this.worker) {
          this.worker.postMessage(null)
        }
      }
      // keep better tactics, discard others?
      this.attachEventListener(window, 'beforeunload', alertWorker, false)
      this.attachEventListener(document.body, 'mouseleave', alertWorker, false, false)
      // TODO: stop session after inactivity timeout (make configurable)
      this.attachEventListener(document, 'visibilitychange', alertWorker, false)
    } catch (e) {
      this._debug('worker_start', e)
    }
  }

  private _debug(context: string, e: any) {
    if (this.options.__debug_report_edp !== null) {
      fetch(this.options.__debug_report_edp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          error: `${e}`,
        }),
      })
    }
    this.debug.error('OpenReplay error: ', context, e)
  }

  send(message: Message, urgent = false): void {
    if (this.activityState === ActivityState.NotActive) {
      return
    }
    this.messages.push(message)
    // TODO: commit on start if there were `urgent` sends;
    // Clearify where urgent can be used for;
    // Clearify workflow for each type of message in case it was sent before start
    //      (like Fetch before start; maybe add an option "preCapture: boolean" or sth alike)
    if (this.activityState === ActivityState.Active && urgent) {
      this.commit()
    }
  }
  private commit(): void {
    if (this.worker && this.messages.length) {
      this.messages.unshift(Timestamp(now()))
      this.worker.postMessage(this.messages)
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
    }
  }

  safe<T extends (this: any, ...args: any[]) => void>(fn: T): T {
    const app = this
    return function (this: any, ...args: any[]) {
      try {
        fn.apply(this, args)
      } catch (e) {
        app._debug('safe_fn_call', e)
        // time: now(),
        // name: e.name,
        // message: e.message,
        // stack: e.stack
      }
    } as T // TODO: correct typing
  }

  attachCommitCallback(cb: CommitCallback): void {
    this.commitCallbacks.push(cb)
  }
  attachStartCallback(cb: StartCallback, useSafe = false): void {
    if (useSafe) {
      cb = this.safe(cb)
    }
    this.startCallbacks.push(cb)
  }
  attachStopCallback(cb: () => any, useSafe = false): void {
    if (useSafe) {
      cb = this.safe(cb)
    }
    this.stopCallbacks.push(cb)
  }
  // Use  app.nodes.attachNodeListener for registered nodes instead
  attachEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    useSafe = true,
    useCapture = true,
  ): void {
    if (useSafe) {
      listener = this.safe(listener)
    }
    this.attachStartCallback(() => target.addEventListener(type, listener, useCapture), useSafe)
    this.attachStopCallback(() => target.removeEventListener(type, listener, useCapture), useSafe)
  }

  // TODO: full correct semantic
  checkRequiredVersion(version: string): boolean {
    const reqVer = version.split(/[.-]/)
    const ver = this.version.split(/[.-]/)
    for (let i = 0; i < 3; i++) {
      if (isNaN(Number(ver[i])) || isNaN(Number(reqVer[i]))) {
        return false
      }
      if (Number(ver[i]) > Number(reqVer[i])) {
        return true
      }
      if (Number(ver[i]) < Number(reqVer[i])) {
        return false
      }
    }
    return true
  }

  private getTrackerInfo() {
    return {
      userUUID: this.localStorage.getItem(this.options.local_uuid_key),
      projectKey: this.projectKey,
      revID: this.revID,
      trackerVersion: this.version,
      isSnippet: this.options.__is_snippet,
    }
  }
  getSessionInfo() {
    return {
      ...this.session.getInfo(),
      ...this.getTrackerInfo(),
    }
  }
  getSessionToken(): string | undefined {
    return this.session.getSessionToken()
  }
  getSessionID(): string | undefined {
    return this.session.getInfo().sessionID || undefined
  }

  getSessionURL(): string | undefined {
    const { projectID, sessionID } = this.session.getInfo()
    if (!projectID || !sessionID) {
      this.debug.error('OpenReplay error: Unable to build session URL')
      return undefined
    }

    return this.options.ingestPoint.replace(/ingest$/, `${projectID}/session/${sessionID}`)
  }

  getHost(): string {
    return new URL(this.options.ingestPoint).host
  }
  getProjectKey(): string {
    return this.projectKey
  }
  getBaseHref(): string {
    if (typeof this.options.resourceBaseHref === 'string') {
      return this.options.resourceBaseHref
    } else if (typeof this.options.resourceBaseHref === 'object') {
      //TODO: switch between types
    }
    if (document.baseURI) {
      return document.baseURI
    }
    // IE only
    return (
      document.head?.getElementsByTagName('base')[0]?.getAttribute('href') ||
      location.origin + location.pathname
    )
  }
  resolveResourceURL(resourceURL: string): string {
    const base = new URL(this.getBaseHref())
    base.pathname += '/' + new URL(resourceURL).pathname
    base.pathname.replace(/\/+/g, '/')
    return base.toString()
  }

  isServiceURL(url: string): boolean {
    return url.startsWith(this.options.ingestPoint)
  }

  active(): boolean {
    return this.activityState === ActivityState.Active
  }

  resetNextPageSession(flag: boolean) {
    if (flag) {
      this.sessionStorage.setItem(this.options.session_reset_key, 't')
    } else {
      this.sessionStorage.removeItem(this.options.session_reset_key)
    }
  }
  private _start(startOpts: StartOptions): Promise<StartPromiseReturn> {
    if (!this.worker) {
      return Promise.resolve(UnsuccessfulStart('No worker found: perhaps, CSP is not set.'))
    }
    if (this.activityState !== ActivityState.NotActive) {
      return Promise.resolve(
        UnsuccessfulStart(
          'OpenReplay: trying to call `start()` on the instance that has been started already.',
        ),
      )
    }
    this.activityState = ActivityState.Starting
    if (startOpts.sessionHash) {
      this.session.applySessionHash(startOpts.sessionHash)
    }

    const timestamp = now()
    const startWorkerMsg: WorkerMessageData = {
      type: 'start',
      pageNo: this.session.incPageNo(),
      ingestPoint: this.options.ingestPoint,
      timestamp,
      url: document.URL,
      connAttemptCount: this.options.connAttemptCount,
      connAttemptGap: this.options.connAttemptGap,
    }
    this.worker.postMessage(startWorkerMsg)

    this.session.update({
      // TODO: transparent "session" module logic AND explicit internal api for plugins.
      // "updating" with old metadata in order to trigger session's UpdateCallbacks.
      // (for the case of internal .start() calls, like on "restart" webworker signal or assistent connection in tracker-assist )
      metadata: startOpts.metadata || this.session.getInfo().metadata,
      userID: startOpts.userID,
    })

    const sReset = this.sessionStorage.getItem(this.options.session_reset_key)
    this.sessionStorage.removeItem(this.options.session_reset_key)
    const shouldReset = startOpts.forceNew || sReset !== null

    return window
      .fetch(this.options.ingestPoint + '/v1/web/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.getTrackerInfo(),
          timestamp,
          userID: this.session.getInfo().userID,
          token: shouldReset ? undefined : this.session.getSessionToken(),
          deviceMemory,
          jsHeapSizeLimit,
        }),
      })
      .then((r) => {
        if (r.status === 200) {
          return r.json()
        } else {
          return r
            .text()
            .then((text) =>
              text === CANCELED
                ? Promise.reject(CANCELED)
                : Promise.reject(`Server error: ${r.status}. ${text}`),
            )
        }
      })
      .then((r) => {
        if (!this.worker) {
          return Promise.reject('no worker found after start request (this might not happen)')
        }
        if (this.activityState === ActivityState.NotActive) {
          return Promise.reject('Tracker stopped during authorisation')
        }
        const {
          token,
          userUUID,
          sessionID,
          projectID,
          beaconSizeLimit,
          startTimestamp, // real startTS, derived from sessionID
        } = r
        if (
          typeof token !== 'string' ||
          typeof userUUID !== 'string' ||
          //typeof startTimestamp !== 'number' ||
          //typeof sessionID !== 'string' ||
          (typeof beaconSizeLimit !== 'number' && typeof beaconSizeLimit !== 'undefined')
        ) {
          return Promise.reject(`Incorrect server response: ${JSON.stringify(r)}`)
        }
        if (sessionID !== this.session.getInfo().sessionID) {
          this.session.reset()
        }
        this.session.setSessionToken(token)
        this.session.update({ sessionID, timestamp: startTimestamp || timestamp, projectID }) // TODO: no no-explicit 'any'
        this.localStorage.setItem(this.options.local_uuid_key, userUUID)

        const startWorkerMsg: WorkerMessageData = {
          type: 'auth',
          token,
          beaconSizeLimit,
        }
        this.worker.postMessage(startWorkerMsg)

        const onStartInfo = { sessionToken: token, userUUID, sessionID }

        this.startCallbacks.forEach((cb) => cb(onStartInfo)) // TODO: start as early as possible (before receiving the token)
        this.observer.observe()
        this.ticker.start()
        this.activityState = ActivityState.Active

        this.notify.log('OpenReplay tracking started.')
        // get rid of onStart ?
        if (typeof this.options.onStart === 'function') {
          this.options.onStart(onStartInfo)
        }
        return SuccessfulStart(onStartInfo)
      })
      .catch((reason) => {
        this.stop()
        this.session.reset()
        if (reason === CANCELED) {
          return UnsuccessfulStart(CANCELED)
        }

        this.notify.log('OpenReplay was unable to start. ', reason)
        this._debug('session_start', reason)
        return UnsuccessfulStart(START_ERROR)
      })
  }

  start(options: StartOptions = {}): Promise<StartPromiseReturn> {
    if (!document.hidden) {
      return this._start(options)
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            resolve(this._start(options))
          }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
      })
    }
  }
  stop(stopWorker = true): void {
    if (this.activityState !== ActivityState.NotActive) {
      try {
        this.sanitizer.clear()
        this.observer.disconnect()
        this.nodes.clear()
        this.ticker.stop()
        this.stopCallbacks.forEach((cb) => cb())
        this.notify.log('OpenReplay tracking stopped.')
        if (this.worker && stopWorker) {
          this.worker.postMessage('stop')
        }
      } finally {
        this.activityState = ActivityState.NotActive
      }
    }
  }
  restart() {
    this.stop(false)
    this.start({ forceNew: false })
  }
}
