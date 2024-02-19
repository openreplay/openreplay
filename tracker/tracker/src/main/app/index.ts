import ConditionsManager from '../modules/conditionsManager.js'
import FeatureFlags from '../modules/featureFlags.js'
import Message, { TagTrigger } from './messages.gen.js'
import {
  Timestamp,
  Metadata,
  UserID,
  Type as MType,
  TabChange,
  TabData,
  WSChannel,
} from './messages.gen.js'
import {
  now,
  adjustTimeOrigin,
  deprecationWarn,
  inIframe,
  createEventListener,
  deleteEventListener,
  requestIdleCb,
} from '../utils.js'
import Nodes from './nodes.js'
import Observer from './observer/top_observer.js'
import Sanitizer from './sanitizer.js'
import Ticker from './ticker.js'
import Logger, { LogLevel, ILogLevel } from './logger.js'
import Session from './session.js'
import { gzip } from 'fflate'
import { deviceMemory, jsHeapSizeLimit } from '../modules/performance.js'
import AttributeSender from '../modules/attributeSender.js'
import type { Options as ObserverOptions } from './observer/top_observer.js'
import type { Options as SanitizerOptions } from './sanitizer.js'
import type { Options as SessOptions } from './session.js'
import type { Options as NetworkOptions } from '../modules/network.js'
import CanvasRecorder from './canvas.js'
import UserTestManager from '../modules/userTesting/index.js'
import TagWatcher from '../modules/tagWatcher.js'

import type {
  Options as WebworkerOptions,
  ToWorkerData,
  FromWorkerData,
} from '../../common/interaction.js'

interface TypedWorker extends Omit<Worker, 'postMessage'> {
  postMessage(data: ToWorkerData): void
}

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
const uxtStorageKey = 'or_uxt_active'
const bufferStorageKey = 'or_buffer_1'
const START_ERROR = ':(' as const
type SuccessfulStart = OnStartInfo & {
  success: true
}
type UnsuccessfulStart = {
  reason: typeof CANCELED | string
  success: false
}

type RickRoll = {
  source: string
  context: string
} & (
  | {
      line: 'never-gonna-give-you-up'
    }
  | {
      line: 'never-gonna-let-you-down'
      token: string
    }
  | {
      line: 'never-gonna-run-around-and-desert-you'
      token: string
    }
)

const UnsuccessfulStart = (reason: string): UnsuccessfulStart => ({ reason, success: false })
const SuccessfulStart = (body: OnStartInfo): SuccessfulStart => ({ ...body, success: true })
export type StartPromiseReturn = SuccessfulStart | UnsuccessfulStart

type StartCallback = (i: OnStartInfo) => void
type CommitCallback = (messages: Array<Message>) => void

enum ActivityState {
  NotActive,
  Starting,
  Active,
  ColdStart,
}

type AppOptions = {
  revID: string
  node_id: string
  session_reset_key: string
  session_token_key: string
  session_pageno_key: string
  session_tabid_key: string
  local_uuid_key: string
  ingestPoint: string
  resourceBaseHref: string | null // resourceHref?
  __is_snippet: boolean
  __debug_report_edp: string | null
  __debug__?: ILogLevel
  __save_canvas_locally?: boolean
  fixedCanvasScaling?: boolean
  localStorage: Storage | null
  sessionStorage: Storage | null
  forceSingleTab?: boolean
  disableStringDict?: boolean
  assistSocketHost?: string

  /** @deprecated */
  onStart?: StartCallback
  network?: NetworkOptions
} & WebworkerOptions &
  SessOptions

export type Options = AppOptions & ObserverOptions & SanitizerOptions

// TODO: use backendHost only
export const DEFAULT_INGEST_POINT = 'https://api.openreplay.com/ingest'

function getTimezone() {
  const offset = new Date().getTimezoneOffset() * -1
  const sign = offset >= 0 ? '+' : '-'
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

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
  /**
   * we need 2 buffers, so we don't lose anything
   * @read coldStart implementation
   * */
  private bufferedMessages1: Array<Message> = []
  private readonly bufferedMessages2: Array<Message> = []
  /* private */
  readonly observer: Observer // non-private for attachContextCallback
  private readonly startCallbacks: Array<StartCallback> = []
  private readonly stopCallbacks: Array<() => any> = []
  private readonly commitCallbacks: Array<CommitCallback> = []
  public readonly options: AppOptions
  public readonly networkOptions?: NetworkOptions
  private readonly revID: string
  private activityState: ActivityState = ActivityState.NotActive
  private readonly version = 'TRACKER_VERSION' // TODO: version compatability check inside each plugin.
  private readonly worker?: TypedWorker

  private compressionThreshold = 24 * 1000
  private restartAttempts = 0
  private readonly bc: BroadcastChannel | null = null
  private readonly contextId
  public attributeSender: AttributeSender
  private canvasRecorder: CanvasRecorder | null = null
  private uxtManager: UserTestManager
  private conditionsManager: ConditionsManager | null = null
  public featureFlags: FeatureFlags
  private tagWatcher: TagWatcher

  constructor(
    projectKey: string,
    sessionToken: string | undefined,
    options: Partial<Options>,
    private readonly signalError: (error: string, apis: string[]) => void,
  ) {
    this.contextId = Math.random().toString(36).slice(2)
    this.projectKey = projectKey
    this.networkOptions = options.network
    this.options = Object.assign(
      {
        revID: '',
        node_id: '__openreplay_id',
        session_token_key: '__openreplay_token',
        session_pageno_key: '__openreplay_pageno',
        session_reset_key: '__openreplay_reset',
        session_tabid_key: '__openreplay_tabid',
        local_uuid_key: '__openreplay_uuid',
        ingestPoint: DEFAULT_INGEST_POINT,
        resourceBaseHref: null,
        __is_snippet: false,
        __debug_report_edp: null,
        __debug__: LogLevel.Silent,
        __save_canvas_locally: false,
        localStorage: null,
        sessionStorage: null,
        disableStringDict: false,
        forceSingleTab: false,
        assistSocketHost: '',
        fixedCanvasScaling: false,
      },
      options,
    )

    if (!this.options.forceSingleTab && globalThis && 'BroadcastChannel' in globalThis) {
      const host = location.hostname.split('.').slice(-2).join('_')
      this.bc = inIframe() ? null : new BroadcastChannel(`rick_${host}`)
    }

    this.revID = this.options.revID
    this.localStorage = this.options.localStorage ?? window.localStorage
    this.sessionStorage = this.options.sessionStorage ?? window.sessionStorage
    this.sanitizer = new Sanitizer(this, options)
    this.nodes = new Nodes(this.options.node_id)
    this.observer = new Observer(this, options)
    this.ticker = new Ticker(this)
    this.ticker.attach(() => this.commit())
    this.debug = new Logger(this.options.__debug__)
    this.session = new Session(this, this.options)
    this.attributeSender = new AttributeSender(this, Boolean(this.options.disableStringDict))
    this.featureFlags = new FeatureFlags(this)
    this.tagWatcher = new TagWatcher(this.sessionStorage, this.debug.error, (tag) => {
      this.send(TagTrigger(tag) as Message)
    })
    this.session.attachUpdateCallback(({ userID, metadata }) => {
      if (userID != null) {
        // TODO: nullable userID
        this.send(UserID(userID))
      }
      if (metadata != null) {
        Object.entries(metadata).forEach(([key, value]) => this.send(Metadata(key, value)))
      }
    })

    // @deprecated (use sessionHash on start instead)
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
      this.worker.onmessage = ({ data }: MessageEvent<FromWorkerData>) => {
        if (data === 'restart') {
          this.stop(false)
          void this.start({}, true)
        } else if (data === 'not_init') {
          this.debug.warn('OR WebWorker: writer not initialised. Restarting tracker')
        } else if (data.type === 'failure') {
          this.stop(false)
          this.debug.error('worker_failed', data.reason)
          this._debug('worker_failed', data.reason)
        } else if (data.type === 'compress') {
          const batch = data.batch
          const batchSize = batch.byteLength
          if (batchSize > this.compressionThreshold) {
            gzip(data.batch, { mtime: 0 }, (err, result) => {
              if (err) {
                this.debug.error('Openreplay compression error:', err)
                this.stop(false)
                if (this.restartAttempts < 3) {
                  this.restartAttempts += 1
                  void this.start({}, true)
                }
              } else {
                this.worker?.postMessage({ type: 'compressed', batch: result })
              }
            })
          } else {
            this.worker?.postMessage({ type: 'uncompressed', batch: batch })
          }
        } else if (data.type === 'queue_empty') {
          this.onSessionSent()
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

    const thisTab = this.session.getTabId()

    const proto = {
      // ask if there are any tabs alive
      ask: 'never-gonna-give-you-up',
      // yes, there are someone out there
      resp: 'never-gonna-let-you-down',
      // you stole someone's identity
      reg: 'never-gonna-run-around-and-desert-you',
    } as const

    if (this.bc) {
      this.bc.postMessage({
        line: proto.ask,
        source: thisTab,
        context: this.contextId,
      })
    }

    if (this.bc !== null) {
      this.bc.onmessage = (ev: MessageEvent<RickRoll>) => {
        if (ev.data.context === this.contextId) {
          return
        }
        if (ev.data.line === proto.resp) {
          const sessionToken = ev.data.token
          this.session.setSessionToken(sessionToken)
        }
        if (ev.data.line === proto.reg) {
          const sessionToken = ev.data.token
          this.session.regenerateTabId()
          this.session.setSessionToken(sessionToken)
        }
        if (ev.data.line === proto.ask) {
          const token = this.session.getSessionToken()
          if (token && this.bc) {
            this.bc.postMessage({
              line: ev.data.source === thisTab ? proto.reg : proto.resp,
              token,
              source: thisTab,
              context: this.contextId,
            })
          }
        }
      }
    }
  }

  private _debug(context: string, e: any) {
    if (this.options.__debug_report_edp !== null) {
      void fetch(this.options.__debug_report_edp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          // @ts-ignore
          error: `${e as unknown as string}`,
        }),
      })
    }
    this.debug.error('OpenReplay error: ', context, e)
  }

  private _usingOldFetchPlugin = false

  send(message: Message, urgent = false): void {
    if (this.activityState === ActivityState.NotActive) {
      return
    }
    // === Back compatibility with Fetch/Axios plugins ===
    if (message[0] === MType.Fetch) {
      this._usingOldFetchPlugin = true
      deprecationWarn('Fetch plugin', "'network' init option", '/installation/network-options')
      deprecationWarn('Axios plugin', "'network' init option", '/installation/network-options')
    }
    if (this._usingOldFetchPlugin && message[0] === MType.NetworkRequest) {
      return
    }

    // ====================================================
    if (this.activityState === ActivityState.ColdStart) {
      this.bufferedMessages1.push(message)
      if (!this.singleBuffer) {
        this.bufferedMessages2.push(message)
      }
      this.conditionsManager?.processMessage(message)
    } else {
      this.messages.push(message)
    }
    // TODO: commit on start if there were `urgent` sends;
    // Clarify where urgent can be used for;
    // Clarify workflow for each type of message in case it was sent before start
    //      (like Fetch before start; maybe add an option "preCapture: boolean" or sth alike)
    // Careful: `this.delay` is equal to zero before start so all Timestamp-s will have to be updated on start
    if (this.activityState === ActivityState.Active && urgent) {
      this.commit()
    }
  }

  /**
   * Normal workflow: add timestamp and tab data to batch, then commit it
   * every ~30ms
   * */
  private _nCommit(): void {
    if (this.worker !== undefined && this.messages.length) {
      requestIdleCb(() => {
        this.messages.unshift(TabData(this.session.getTabId()))
        this.messages.unshift(Timestamp(this.timestamp()))
        // why I need to add opt chaining?
        this.worker?.postMessage(this.messages)
        this.commitCallbacks.forEach((cb) => cb(this.messages))
        this.messages.length = 0
      })
    }
  }

  coldStartCommitN = 0

  /**
   * Cold start: add timestamp and tab data to both batches
   * every 2nd tick, ~60ms
   * this will make batches a bit larger and replay will work with bigger jumps every frame
   * but in turn we don't overload batch writer on session start with 1000 batches
   * */
  private _cStartCommit(): void {
    this.coldStartCommitN += 1
    if (this.coldStartCommitN === 2) {
      this.bufferedMessages1.push(Timestamp(this.timestamp()))
      this.bufferedMessages1.push(TabData(this.session.getTabId()))
      this.bufferedMessages2.push(Timestamp(this.timestamp()))
      this.bufferedMessages2.push(TabData(this.session.getTabId()))
      this.coldStartCommitN = 0
    }
  }

  private commit(): void {
    if (this.activityState === ActivityState.ColdStart) {
      this._cStartCommit()
    } else {
      this._nCommit()
    }
  }

  private postToWorker(messages: Array<Message>) {
    this.worker?.postMessage(messages)
    this.commitCallbacks.forEach((cb) => cb(messages))
    messages.length = 0
  }

  private delay = 0

  timestamp(): number {
    return now() + this.delay
  }

  safe<T extends (this: any, ...args: any[]) => void>(fn: T): T {
    const app = this
    return function (this: any, ...args: any[]) {
      try {
        fn.apply(this, args)
      } catch (e) {
        app._debug('safe_fn_call', e)
        // time: this.timestamp(),
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
    this.attachStartCallback(
      () => (target ? createEventListener(target, type, listener, useCapture) : null),
      useSafe,
    )
    this.attachStopCallback(
      () => (target ? deleteEventListener(target, type, listener, useCapture) : null),
      useSafe,
    )
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

  getSessionURL(options?: { withCurrentTime?: boolean }): string | undefined {
    const { projectID, sessionID, timestamp } = this.session.getInfo()
    if (!projectID || !sessionID) {
      this.debug.error('OpenReplay error: Unable to build session URL')
      return undefined
    }
    const ingest = this.options.ingestPoint
    const isSaas = /api\.openreplay\.com/.test(ingest)

    const projectPath = isSaas ? 'https://app.openreplay.com/ingest' : ingest

    const url = projectPath.replace(/ingest$/, `${projectID}/session/${sessionID}`)

    if (options?.withCurrentTime) {
      const jumpTo = now() - timestamp
      return `${url}?jumpto=${jumpTo}`
    }

    return url
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

  coldInterval: ReturnType<typeof setInterval> | null = null
  orderNumber = 0
  coldStartTs = 0
  singleBuffer = false

  private checkSessionToken(forceNew?: boolean) {
    const lsReset = this.sessionStorage.getItem(this.options.session_reset_key) !== null
    const needNewSessionID = forceNew || lsReset
    const sessionToken = this.session.getSessionToken()

    return needNewSessionID || !sessionToken
  }

  /**
   * start buffering messages without starting the actual session, which gives
   * user 30 seconds to "activate" and record session by calling `start()` on conditional trigger
   * and we will then send buffered batch, so it won't get lost
   * */
  public async coldStart(startOpts: StartOptions = {}, conditional?: boolean) {
    this.singleBuffer = false
    const second = 1000
    if (conditional) {
      this.conditionsManager = new ConditionsManager(this, startOpts)
    }
    const isNewSession = this.checkSessionToken(startOpts.forceNew)
    if (conditional) {
      const r = await fetch(this.options.ingestPoint + '/v1/web/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.getTrackerInfo(),
          timestamp: now(),
          doNotRecord: true,
          bufferDiff: 0,
          userID: this.session.getInfo().userID,
          token: undefined,
          deviceMemory,
          jsHeapSizeLimit,
          timezone: getTimezone(),
        }),
      })
      const {
        // this token is needed to fetch conditions and flags,
        // but it can't be used to record a session
        token,
        userBrowser,
        userCity,
        userCountry,
        userDevice,
        userOS,
        userState,
        projectID,
      } = await r.json()
      this.session.assign({ projectID })
      this.session.setUserInfo({
        userBrowser,
        userCity,
        userCountry,
        userDevice,
        userOS,
        userState,
      })
      const onStartInfo = { sessionToken: token, userUUID: '', sessionID: '' }
      this.startCallbacks.forEach((cb) => cb(onStartInfo))
      await this.conditionsManager?.fetchConditions(projectID as string, token as string)
      await this.featureFlags.reloadFlags(token as string)
      await this.tagWatcher.fetchTags(this.options.ingestPoint, token as string)
      this.conditionsManager?.processFlags(this.featureFlags.flags)
    }
    const cycle = () => {
      this.orderNumber += 1
      adjustTimeOrigin()
      this.coldStartTs = now()
      if (this.orderNumber % 2 === 0) {
        this.bufferedMessages1.length = 0
        this.bufferedMessages1.push(Timestamp(this.timestamp()))
        this.bufferedMessages1.push(TabData(this.session.getTabId()))
      } else {
        this.bufferedMessages2.length = 0
        this.bufferedMessages2.push(Timestamp(this.timestamp()))
        this.bufferedMessages2.push(TabData(this.session.getTabId()))
      }
      this.stop(false)
      this.activityState = ActivityState.ColdStart
      if (startOpts.sessionHash) {
        this.session.applySessionHash(startOpts.sessionHash)
      }
      if (startOpts.forceNew) {
        this.session.reset()
      }
      this.session.assign({
        userID: startOpts.userID,
        metadata: startOpts.metadata,
      })
      if (!isNewSession) {
        this.debug.log('continuing session on new tab', this.session.getTabId())
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.send(TabChange(this.session.getTabId()))
      }
      this.observer.observe()
      this.ticker.start()
    }
    this.coldInterval = setInterval(() => {
      cycle()
    }, 30 * second)
    cycle()
  }

  onSessionSent = () => {
    return
  }

  /**
   * Starts offline session recording
   * @param {Object} startOpts - options for session start, same as .start()
   * @param {Function} onSessionSent - callback that will be called once session is fully sent
   * */
  public offlineRecording(startOpts: StartOptions = {}, onSessionSent: () => void) {
    this.onSessionSent = onSessionSent
    this.singleBuffer = true
    const isNewSession = this.checkSessionToken(startOpts.forceNew)
    adjustTimeOrigin()
    this.coldStartTs = now()
    const saverBuffer = this.localStorage.getItem(bufferStorageKey)
    if (saverBuffer) {
      const data = JSON.parse(saverBuffer)
      this.bufferedMessages1 = Array.isArray(data) ? data : this.bufferedMessages1
      this.localStorage.removeItem(bufferStorageKey)
    }
    this.bufferedMessages1.push(Timestamp(this.timestamp()))
    this.bufferedMessages1.push(TabData(this.session.getTabId()))
    this.activityState = ActivityState.ColdStart
    if (startOpts.sessionHash) {
      this.session.applySessionHash(startOpts.sessionHash)
    }
    if (startOpts.forceNew) {
      this.session.reset()
    }
    this.session.assign({
      userID: startOpts.userID,
      metadata: startOpts.metadata,
    })
    const onStartInfo = { sessionToken: '', userUUID: '', sessionID: '' }
    this.startCallbacks.forEach((cb) => cb(onStartInfo))
    if (!isNewSession) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.send(TabChange(this.session.getTabId()))
    }
    this.observer.observe()
    this.ticker.start()

    return {
      saveBuffer: this.saveBuffer,
      getBuffer: this.getBuffer,
      setBuffer: this.setBuffer,
    }
  }

  /**
   * Saves the captured messages in localStorage (or whatever is used in its place)
   *
   * Then when this.offlineRecording is called, it will preload this messages and clear the storage item
   *
   * Keeping the size of local storage reasonable is up to the end users of this library
   * */
  public saveBuffer() {
    this.localStorage.setItem(bufferStorageKey, JSON.stringify(this.bufferedMessages1))
  }

  /**
   * @returns buffer with stored messages for offline recording
   * */
  public getBuffer() {
    return this.bufferedMessages1
  }

  /**
   * Used to set a buffer with messages array
   * */
  public setBuffer(buffer: Message[]) {
    this.bufferedMessages1 = buffer
  }

  /**
   * Uploads the stored session buffer to backend
   * @returns promise that resolves once messages are loaded, it has to be awaited
   * so the session can be uploaded properly
   * @resolve - if messages were loaded in service worker successfully
   * @reject {string} - error message
   * */
  public async uploadOfflineRecording() {
    this.stop(false)
    const timestamp = now()
    this.worker?.postMessage({
      type: 'start',
      pageNo: this.session.incPageNo(),
      ingestPoint: this.options.ingestPoint,
      timestamp: this.coldStartTs,
      url: document.URL,
      connAttemptCount: this.options.connAttemptCount,
      connAttemptGap: this.options.connAttemptGap,
      tabId: this.session.getTabId(),
    })
    const r = await fetch(this.options.ingestPoint + '/v1/web/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.getTrackerInfo(),
        timestamp: timestamp,
        doNotRecord: false,
        bufferDiff: timestamp - this.coldStartTs,
        userID: this.session.getInfo().userID,
        token: undefined,
        deviceMemory,
        jsHeapSizeLimit,
        timezone: getTimezone(),
      }),
    })
    const {
      token,
      userBrowser,
      userCity,
      userCountry,
      userDevice,
      userOS,
      userState,
      beaconSizeLimit,
      projectID,
    } = await r.json()
    this.worker?.postMessage({
      type: 'auth',
      token,
      beaconSizeLimit,
    })
    this.session.assign({ projectID })
    this.session.setUserInfo({
      userBrowser,
      userCity,
      userCountry,
      userDevice,
      userOS,
      userState,
    })
    while (this.bufferedMessages1.length > 0) {
      await this.flushBuffer(this.bufferedMessages1)
    }
    this.postToWorker([['q_end']] as unknown as Message[])
    this.clearBuffers()
  }

  private _start(
    startOpts: StartOptions = {},
    resetByWorker = false,
    conditionName?: string,
  ): Promise<StartPromiseReturn> {
    const isColdStart = this.activityState === ActivityState.ColdStart
    if (isColdStart && this.coldInterval) {
      clearInterval(this.coldInterval)
    }
    if (!this.worker) {
      const reason = 'No worker found: perhaps, CSP is not set.'
      this.signalError(reason, [])
      return Promise.resolve(UnsuccessfulStart(reason))
    }
    if (
      this.activityState === ActivityState.Active ||
      this.activityState === ActivityState.Starting
    ) {
      const reason =
        'OpenReplay: trying to call `start()` on the instance that has been started already.'
      return Promise.resolve(UnsuccessfulStart(reason))
    }
    this.activityState = ActivityState.Starting
    if (!isColdStart) {
      adjustTimeOrigin()
    }

    if (startOpts.sessionHash) {
      this.session.applySessionHash(startOpts.sessionHash)
    }
    if (startOpts.forceNew) {
      // Reset session metadata only if requested directly
      this.session.reset()
    }
    this.session.assign({
      // MBTODO: maybe it would make sense to `forceNew` if the `userID` was changed
      userID: startOpts.userID,
      metadata: startOpts.metadata,
    })

    const timestamp = now()
    this.worker.postMessage({
      type: 'start',
      pageNo: this.session.incPageNo(),
      ingestPoint: this.options.ingestPoint,
      timestamp: isColdStart ? this.coldStartTs : timestamp,
      url: document.URL,
      connAttemptCount: this.options.connAttemptCount,
      connAttemptGap: this.options.connAttemptGap,
      tabId: this.session.getTabId(),
    })

    const sessionToken = this.session.getSessionToken()
    const isNewSession = this.checkSessionToken(startOpts.forceNew)
    this.sessionStorage.removeItem(this.options.session_reset_key)

    this.debug.log(
      'OpenReplay: starting session; need new session id?',
      isNewSession,
      'session token: ',
      sessionToken,
    )
    return window
      .fetch(this.options.ingestPoint + '/v1/web/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.getTrackerInfo(),
          timestamp,
          doNotRecord: false,
          bufferDiff: timestamp - this.coldStartTs,
          userID: this.session.getInfo().userID,
          token: isNewSession ? undefined : sessionToken,
          deviceMemory,
          jsHeapSizeLimit,
          timezone: getTimezone(),
          condition: conditionName,
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
      .then(async (r) => {
        if (!this.worker) {
          const reason = 'no worker found after start request (this might not happen)'
          this.signalError(reason, [])
          return Promise.reject(reason)
        }
        if (this.activityState === ActivityState.NotActive) {
          const reason = 'Tracker stopped during authorization'
          this.signalError(reason, [])
          return Promise.reject(reason)
        }
        const {
          token,
          userUUID,
          projectID,
          beaconSizeLimit,
          compressionThreshold, // how big the batch should be before we decide to compress it
          delay, //  derived from token
          sessionID, //  derived from token
          startTimestamp, // real startTS (server time), derived from sessionID
          userBrowser,
          userCity,
          userCountry,
          userDevice,
          userOS,
          userState,
          canvasEnabled,
          canvasQuality,
          canvasFPS,
        } = r
        if (
          typeof token !== 'string' ||
          typeof userUUID !== 'string' ||
          (typeof startTimestamp !== 'number' && typeof startTimestamp !== 'undefined') ||
          typeof sessionID !== 'string' ||
          typeof delay !== 'number' ||
          (typeof beaconSizeLimit !== 'number' && typeof beaconSizeLimit !== 'undefined')
        ) {
          const reason = `Incorrect server response: ${JSON.stringify(r)}`
          this.signalError(reason, [])
          return Promise.reject(reason)
        }
        this.delay = delay
        this.session.setSessionToken(token)
        this.session.setUserInfo({
          userBrowser,
          userCity,
          userCountry,
          userDevice,
          userOS,
          userState,
        })
        this.session.assign({
          sessionID,
          timestamp: startTimestamp || timestamp,
          projectID,
        })

        this.worker.postMessage({
          type: 'auth',
          token,
          beaconSizeLimit,
        })

        if (!isNewSession && token === sessionToken) {
          this.debug.log('continuing session on new tab', this.session.getTabId())
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this.send(TabChange(this.session.getTabId()))
        }
        // (Re)send Metadata for the case of a new session
        Object.entries(this.session.getInfo().metadata).forEach(([key, value]) =>
          this.send(Metadata(key, value)),
        )
        this.localStorage.setItem(this.options.local_uuid_key, userUUID)

        this.compressionThreshold = compressionThreshold
        const onStartInfo = { sessionToken: token, userUUID, sessionID }
        // TODO: start as early as possible (before receiving the token)
        /** after start */
        this.startCallbacks.forEach((cb) => cb(onStartInfo)) // MBTODO: callbacks after DOM "mounted" (observed)
        void this.featureFlags.reloadFlags()
        await this.tagWatcher.fetchTags(this.options.ingestPoint, token)
        this.activityState = ActivityState.Active

        if (canvasEnabled) {
          this.canvasRecorder =
            this.canvasRecorder ??
            new CanvasRecorder(this, {
              fps: canvasFPS,
              quality: canvasQuality,
              isDebug: this.options.__save_canvas_locally,
              fixedScaling: this.options.fixedCanvasScaling,
            })
          this.canvasRecorder.startTracking()
        }

        /** --------------- COLD START BUFFER ------------------*/
        if (isColdStart) {
          const biggestBuffer =
            this.bufferedMessages1.length > this.bufferedMessages2.length
              ? this.bufferedMessages1
              : this.bufferedMessages2
          while (biggestBuffer.length > 0) {
            await this.flushBuffer(biggestBuffer)
          }
          this.clearBuffers()
          this.commit()
          /** --------------- COLD START BUFFER ------------------*/
        } else {
          this.observer.observe()
          this.ticker.start()
        }

        // get rid of onStart ?
        if (typeof this.options.onStart === 'function') {
          this.options.onStart(onStartInfo)
        }
        this.restartAttempts = 0

        this.uxtManager = this.uxtManager
          ? this.uxtManager
          : new UserTestManager(this, uxtStorageKey)
        let uxtId: number | undefined
        const savedUxtTag = this.localStorage.getItem(uxtStorageKey)
        if (savedUxtTag) {
          uxtId = parseInt(savedUxtTag, 10)
        }
        if (location?.search) {
          const query = new URLSearchParams(location.search)
          if (query.has('oruxt')) {
            const qId = query.get('oruxt')
            uxtId = qId ? parseInt(qId, 10) : undefined
          }
        }

        if (uxtId) {
          if (!this.uxtManager.isActive) {
            // eslint-disable-next-line
            this.uxtManager.getTest(uxtId, token, Boolean(savedUxtTag)).then((id) => {
              if (id) {
                this.onUxtCb.forEach((cb: (id: number) => void) => cb(id))
              }
            })
          } else {
            // @ts-ignore
            this.onUxtCb.forEach((cb: (id: number) => void) => cb(uxtId))
          }
        }

        return SuccessfulStart(onStartInfo)
      })
      .catch((reason) => {
        this.stop()
        this.session.reset()
        if (reason === CANCELED) {
          this.signalError(CANCELED, [])
          return UnsuccessfulStart(CANCELED)
        }

        this._debug('session_start', reason)
        this.signalError(START_ERROR, [])
        return UnsuccessfulStart(START_ERROR)
      })
  }

  restartCanvasTracking = () => {
    this.canvasRecorder?.restartTracking()
  }

  flushBuffer = async (buffer: Message[]) => {
    return new Promise((res) => {
      let ended = false
      const messagesBatch: Message[] = [buffer.shift() as unknown as Message]
      while (!ended) {
        const nextMsg = buffer[0]
        if (!nextMsg || nextMsg[0] === MType.Timestamp) {
          ended = true
        } else {
          messagesBatch.push(buffer.shift() as unknown as Message)
        }
      }
      this.postToWorker(messagesBatch)
      res(null)
    })
  }

  onUxtCb = []

  addOnUxtCb(cb: (id: number) => void) {
    // @ts-ignore
    this.onUxtCb.push(cb)
  }

  getUxtId(): number | null {
    return this.uxtManager?.getTestId()
  }

  /**
   * basically we ask other tabs during constructor
   * and here we just apply 10ms delay just in case
   * */
  start(...args: Parameters<App['_start']>): Promise<StartPromiseReturn> {
    if (!document.hidden) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this._start(...args))
        }, 25)
      })
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            setTimeout(() => {
              resolve(this._start(...args))
            }, 25)
          }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
      })
    }
  }

  forceFlushBatch() {
    this.worker?.postMessage('forceFlushBatch')
  }

  getTabId() {
    return this.session.getTabId()
  }

  clearBuffers() {
    this.bufferedMessages1.length = 0
    this.bufferedMessages2.length = 0
  }

  /**
   * Creates a named hook that expects event name, data string and msg direction (up/down),
   * it will skip any message bigger than 5 mb or event name bigger than 255 symbols
   * @returns {(msgType: string, data: string, dir: "up" | "down") => void}
   * */
  trackWs(channelName: string): (msgType: string, data: string, dir: 'up' | 'down') => void {
    const channel = channelName
    return (msgType: string, data: string, dir: 'up' | 'down' = 'down') => {
      if (
        typeof msgType !== 'string' ||
        typeof data !== 'string' ||
        data.length > 5 * 1024 * 1024 ||
        msgType.length > 255
      ) {
        return
      }
      this.send(WSChannel('websocket', channel, data, this.timestamp(), dir, msgType))
    }
  }

  stop(stopWorker = true): void {
    if (this.activityState !== ActivityState.NotActive) {
      try {
        this.attributeSender.clear()
        this.sanitizer.clear()
        this.observer.disconnect()
        this.nodes.clear()
        this.ticker.stop()
        this.stopCallbacks.forEach((cb) => cb())
        this.debug.log('OpenReplay tracking stopped.')
        this.tagWatcher.clear()
        if (this.worker && stopWorker) {
          this.worker.postMessage('stop')
        }
        this.canvasRecorder?.clear()
      } finally {
        this.activityState = ActivityState.NotActive
      }
    }
  }
}
