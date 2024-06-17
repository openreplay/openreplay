import { gzip } from 'fflate'

import type {
  FromWorkerData,
  Options as WebworkerOptions,
  ToWorkerData,
} from '../../common/interaction.js'
import AttributeSender from '../modules/attributeSender.js'
import ConditionsManager from '../modules/conditionsManager.js'
import FeatureFlags from '../modules/featureFlags.js'
import type { Options as NetworkOptions } from '../modules/network.js'
import { deviceMemory, jsHeapSizeLimit } from '../modules/performance.js'
import TagWatcher from '../modules/tagWatcher.js'
import UserTestManager from '../modules/userTesting/index.js'
import {
  adjustTimeOrigin,
  createEventListener,
  deleteEventListener,
  now,
  requestIdleCb,
  simpleMerge,
} from '../utils.js'
import CanvasRecorder from './canvas.js'
import Logger, { ILogLevel, LogLevel } from './logger.js'
import Message, {
  Metadata,
  TabChange,
  TabData,
  TagTrigger,
  Timestamp,
  Type as MType,
  UserID,
  WSChannel,
} from './messages.gen.js'
import Nodes from './nodes.js'
import type { Options as ObserverOptions } from './observer/top_observer.js'
import Observer from './observer/top_observer.js'
import type { Options as SanitizerOptions } from './sanitizer.js'
import Sanitizer from './sanitizer.js'
import type { Options as SessOptions } from './session.js'
import Session from './session.js'
import Ticker from './ticker.js'

interface TypedWorker extends Omit<Worker, 'postMessage'> {
  postMessage(data: ToWorkerData): void
}

// TODO: Unify and clearly describe options logic
export interface StartOptions {
  userID?: string
  metadata?: Record<string, string>
  forceNew?: boolean
  sessionHash?: string
  assistOnly?: boolean
}

interface OnStartInfo {
  sessionID: string
  sessionToken: string
  userUUID: string
}

const CANCELED = 'canceled' as const
const uxtStorageKey = 'or_uxt_active'
const bufferStorageKey = 'or_buffer_1'

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
  /** @deprecated see canvas prop */
  __save_canvas_locally?: boolean
  /** @deprecated see canvas prop */
  fixedCanvasScaling?: boolean
  localStorage: Storage | null
  sessionStorage: Storage | null
  forceSingleTab?: boolean
  /** Sometimes helps to prevent session breaking due to dict reset */
  disableStringDict?: boolean
  assistSocketHost?: string
  /** @deprecated see canvas prop */
  disableCanvas?: boolean
  canvas: {
    disableCanvas?: boolean
    /**
     * If you expect HI-DPI users mostly, this will render canvas
     * in 1:1 pixel ratio
     * */
    fixedCanvasScaling?: boolean
    __save_canvas_locally?: boolean
    /**
     * Use with care since it hijacks one frame each time it captures
     * snapshot for every canvas
     * */
    useAnimationFrame?: boolean
    /**
     * Use webp unless it produces too big images
     * @default webp
     * */
    fileExt?: 'webp' | 'png' | 'jpeg' | 'avif'
  }
  crossdomain?: {
    /**
     * @default false
     * */
    enabled?: boolean
    /**
     * used to send message up, will be '*' by default
     * (check your CSP settings)
     * @default '*'
     * */
    parentDomain?: string
  }

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
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

const proto = {
  // ask if there are any tabs alive
  ask: 'never-gonna-give-you-up',
  // response from another tab
  resp: 'never-gonna-let-you-down',
  // regenerating id (copied other tab)
  reg: 'never-gonna-run-around-and-desert-you',
  // tracker inside a child iframe
  iframeSignal: 'never-gonna-make-you-cry',
  // getting node id for child iframe
  iframeId: 'never-gonna-say-goodbye',
  // batch of messages from an iframe window
  iframeBatch: 'never-gonna-tell-a-lie-and-hurt-you',
} as const

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
  private worker?: TypedWorker

  public attributeSender: AttributeSender
  public featureFlags: FeatureFlags
  public socketMode = false
  private compressionThreshold = 24 * 1000
  private readonly bc: BroadcastChannel | null = null
  private readonly contextId
  private canvasRecorder: CanvasRecorder | null = null
  private uxtManager: UserTestManager
  private conditionsManager: ConditionsManager | null = null
  private readonly tagWatcher: TagWatcher

  private canStart = false
  private rootId: number | null = null
  private pageFrames: HTMLIFrameElement[] = []
  private frameOderNumber = 0
  private readonly initialHostName = location.hostname

  constructor(
    projectKey: string,
    sessionToken: string | undefined,
    options: Partial<Options>,
    private readonly signalError: (error: string, apis: string[]) => void,
    private readonly insideIframe: boolean,
  ) {
    this.contextId = Math.random().toString(36).slice(2)
    this.projectKey = projectKey

    if (
      Object.keys(options).findIndex((k) => ['fixedCanvasScaling', 'disableCanvas'].includes(k)) !==
      -1
    ) {
      console.warn(
        'Openreplay: canvas options are moving to separate key "canvas" in next update. Please update your configuration.',
      )
      options = {
        ...options,
        canvas: {
          __save_canvas_locally: options.__save_canvas_locally,
          fixedCanvasScaling: options.fixedCanvasScaling,
          disableCanvas: options.disableCanvas,
        },
      }
    }

    this.networkOptions = options.network

    const defaultOptions: Options = {
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
      disableCanvas: false,
      captureIFrames: true,
      obscureTextEmails: true,
      obscureTextNumbers: false,
      crossdomain: {
        parentDomain: '*',
      },
      canvas: {
        disableCanvas: false,
        fixedCanvasScaling: false,
        __save_canvas_locally: false,
        useAnimationFrame: false,
      },
    }
    this.options = simpleMerge(defaultOptions, options)

    if (
      !this.insideIframe &&
      !this.options.forceSingleTab &&
      globalThis &&
      'BroadcastChannel' in globalThis
    ) {
      const host = location.hostname.split('.').slice(-2).join('_')
      this.bc = new BroadcastChannel(`rick_${host}`)
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

    this.initWorker()

    const thisTab = this.session.getTabId()

    if (!this.insideIframe) {
      /**
       * if we get a signal from child iframes, we check for their node_id and send it back,
       * so they can act as if it was just a same-domain iframe
       * */
      let crossdomainFrameCount = 0
      const catchIframeMessage = (event: MessageEvent) => {
        const { data } = event
        if (data.line === proto.iframeSignal) {
          const childIframeDomain = data.domain
          const pageIframes = Array.from(document.querySelectorAll('iframe'))
          this.pageFrames = pageIframes
          const signalId = async () => {
            let tries = 0
            while (tries < 10) {
              const id = this.checkNodeId(pageIframes, childIframeDomain)
              if (id) {
                this.waitStarted()
                  .then(() => {
                    crossdomainFrameCount++
                    const token = this.session.getSessionToken()
                    const iframeData = {
                      line: proto.iframeId,
                      context: this.contextId,
                      domain: childIframeDomain,
                      id,
                      token,
                      frameOrderNumber: crossdomainFrameCount,
                    }
                    this.debug.log('iframe_data', iframeData)
                    // @ts-ignore
                    event.source?.postMessage(iframeData, '*')
                  })
                  .catch(console.error)
                tries = 10
                break
              }
              tries++
              await delay(100)
            }
          }
          void signalId()
        }
        /**
         * proxying messages from iframe to main body, so they can be in one batch (same indexes, etc)
         * plus we rewrite some of the messages to be relative to the main context/window
         * */
        if (data.line === proto.iframeBatch) {
          const msgBatch = data.messages
          const mappedMessages: Message[] = msgBatch.map((msg: Message) => {
            if (msg[0] === MType.MouseMove) {
              let fixedMessage = msg
              this.pageFrames.forEach((frame) => {
                if (frame.dataset.domain === event.data.domain) {
                  const [type, x, y] = msg
                  const { left, top } = frame.getBoundingClientRect()
                  fixedMessage = [type, x + left, y + top]
                }
              })
              return fixedMessage
            }
            if (msg[0] === MType.MouseClick) {
              let fixedMessage = msg
              this.pageFrames.forEach((frame) => {
                if (frame.dataset.domain === event.data.domain) {
                  const [type, id, hesitationTime, label, selector, normX, normY] = msg
                  const { left, top, width, height } = frame.getBoundingClientRect()

                  const contentWidth = document.documentElement.scrollWidth
                  const contentHeight = document.documentElement.scrollHeight
                  // (normalizedX * frameWidth + frameLeftOffset)/docSize
                  const fullX = (normX / 100) * width + left
                  const fullY = (normY / 100) * height + top
                  const fixedX = fullX / contentWidth
                  const fixedY = fullY / contentHeight

                  fixedMessage = [
                    type,
                    id,
                    hesitationTime,
                    label,
                    selector,
                    Math.round(fixedX * 1e3) / 1e1,
                    Math.round(fixedY * 1e3) / 1e1,
                  ]
                }
              })
              return fixedMessage
            }
            return msg
          })
          this.messages.push(...mappedMessages)
        }
      }
      window.addEventListener('message', catchIframeMessage)
      this.attachStopCallback(() => {
        window.removeEventListener('message', catchIframeMessage)
      })
    } else {
      const catchParentMessage = (event: MessageEvent) => {
        const { data } = event
        if (data.line !== proto.iframeId) {
          return
        }
        this.rootId = data.id
        this.session.setSessionToken(data.token as string)
        this.frameOderNumber = data.frameOrderNumber
        this.debug.log('starting iframe tracking', data)
        this.allowAppStart()
      }
      window.addEventListener('message', catchParentMessage)
      this.attachStopCallback(() => {
        window.removeEventListener('message', catchParentMessage)
      })
      // communicating with parent window,
      // even if its crossdomain is possible via postMessage api
      const domain = this.initialHostName
      window.parent.postMessage(
        {
          line: proto.iframeSignal,
          source: thisTab,
          context: this.contextId,
          domain,
        },
        '*',
      )
    }

    if (this.bc !== null) {
      this.bc.postMessage({
        line: proto.ask,
        source: thisTab,
        context: this.contextId,
      })
      this.startTimeout = setTimeout(() => {
        this.allowAppStart()
      }, 500)
      this.bc.onmessage = (ev: MessageEvent<RickRoll>) => {
        if (ev.data.context === this.contextId) {
          return
        }
        if (ev.data.line === proto.resp) {
          const sessionToken = ev.data.token
          this.session.setSessionToken(sessionToken)
          this.allowAppStart()
        }
        if (ev.data.line === proto.reg) {
          const sessionToken = ev.data.token
          this.session.regenerateTabId()
          this.session.setSessionToken(sessionToken)
          this.allowAppStart()
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

  startTimeout: ReturnType<typeof setTimeout> | null = null
  private allowAppStart() {
    this.canStart = true
    if (this.startTimeout) {
      clearTimeout(this.startTimeout)
      this.startTimeout = null
    }
  }

  private checkNodeId(iframes: HTMLIFrameElement[], domain: string) {
    for (const iframe of iframes) {
      if (iframe.dataset.domain === domain) {
        // @ts-ignore
        return iframe[this.options.node_id] as number | undefined
      }
    }
    return null
  }
  private initWorker() {
    try {
      this.worker = new Worker(
        URL.createObjectURL(new Blob(['WEBWORKER_BODY'], { type: 'text/javascript' })),
      )
      this.worker.onerror = (e) => {
        this._debug('webworker_error', e)
      }
      this.worker.onmessage = ({ data }: MessageEvent<FromWorkerData>) => {
        this.handleWorkerMsg(data)
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

  private handleWorkerMsg(data: FromWorkerData) {
    // handling 401 auth restart (new token assignment)
    if (data === 'a_stop') {
      this.stop(false)
    } else if (data === 'a_start') {
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
            this.worker?.postMessage({ type: 'uncompressed', batch: batch })
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

  send(message: Message, urgent = false): void {
    if (this.activityState === ActivityState.NotActive) {
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
    if (this.socketMode) {
      this.messages.unshift(TabData(this.session.getTabId()))
      this.messages.unshift(Timestamp(this.timestamp()))
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
      return
    }
    if (this.worker === undefined || !this.messages.length) {
      return
    }

    if (this.insideIframe) {
      window.parent.postMessage(
        {
          line: proto.iframeBatch,
          messages: this.messages,
          domain: this.initialHostName,
        },
        '*',
      )
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
      return
    }
    try {
      requestIdleCb(() => {
        this.messages.unshift(TabData(this.session.getTabId()))
        this.messages.unshift(Timestamp(this.timestamp()))
        // why I need to add opt chaining?
        this.worker?.postMessage(this.messages)
        this.commitCallbacks.forEach((cb) => cb(this.messages))
        this.messages.length = 0
      })
    } catch (e) {
      this._debug('worker_commit', e)
      this.stop(true)
      setTimeout(() => {
        void this.start()
      }, 500)
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

    const createListener = () =>
      target ? createEventListener(target, type, listener, useCapture) : null
    const deleteListener = () =>
      target ? deleteEventListener(target, type, listener, useCapture) : null

    this.attachStartCallback(createListener, useSafe)
    this.attachStopCallback(deleteListener, useSafe)
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
   * user 30 seconds to "activate" and record session by calling `start()` on conditional trigger,
   * and we will then send buffered batch, so it won't get lost
   * */
  public async coldStart(startOpts: StartOptions = {}, conditional?: boolean) {
    this.singleBuffer = false
    const second = 1000
    const isNewSession = this.checkSessionToken(startOpts.forceNew)
    if (conditional) {
      await this.setupConditionalStart(startOpts)
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

  private async setupConditionalStart(startOpts: StartOptions) {
    this.conditionsManager = new ConditionsManager(this, startOpts)
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
        width: window.innerWidth,
        height: window.innerHeight,
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
   * Then, when this.offlineRecording is called, it will preload this messages and clear the storage item
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

  private async _start(
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
    try {
      const r = await window.fetch(this.options.ingestPoint + '/v1/web/start', {
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
          assistOnly: startOpts.assistOnly ?? this.socketMode,
        }),
      })
      if (r.status !== 200) {
        const error = await r.text()
        const reason = error === CANCELED ? CANCELED : `Server error: ${r.status}. ${error}`
        return Promise.reject(reason)
      }
      if (!this.worker) {
        const reason = 'no worker found after start request (this might not happen)'
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
        assistOnly: socketOnly,
      } = await r.json()

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

      if (socketOnly) {
        this.socketMode = true
        this.worker.postMessage('stop')
      } else {
        this.worker.postMessage({
          type: 'auth',
          token,
          beaconSizeLimit,
        })
      }

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

      if (canvasEnabled && !this.options.canvas.disableCanvas) {
        this.canvasRecorder =
          this.canvasRecorder ??
          new CanvasRecorder(this, {
            fps: canvasFPS,
            quality: canvasQuality,
            isDebug: this.options.canvas.__save_canvas_locally,
            fixedScaling: this.options.canvas.fixedCanvasScaling,
            useAnimationFrame: this.options.canvas.useAnimationFrame,
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
        if (this.insideIframe && this.rootId) {
          this.observer.crossdomainObserve(this.rootId, this.frameOderNumber)
        } else {
          this.observer.observe()
        }
        this.ticker.start()
      }

      this.uxtManager = this.uxtManager ? this.uxtManager : new UserTestManager(this, uxtStorageKey)
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
    } catch (reason) {
      this.stop()
      this.session.reset()
      if (reason === CANCELED) {
        this.signalError(CANCELED, [])
        return UnsuccessfulStart(CANCELED)
      }

      this._debug('session_start', reason)
      const errorMessage = reason instanceof Error ? reason.message : reason.toString()
      this.signalError(errorMessage, [])
      return UnsuccessfulStart(errorMessage)
    }
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

  async waitStart() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.canStart) {
          resolve(true)
        } else {
          setTimeout(check, 25)
        }
      }
      check()
    })
  }

  async waitStarted() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.activityState === ActivityState.Active) {
          resolve(true)
        } else {
          setTimeout(check, 25)
        }
      }
      check()
    })
  }

  /**
   * basically we ask other tabs during constructor
   * and here we just apply 10ms delay just in case
   * */
  async start(...args: Parameters<App['_start']>): Promise<StartPromiseReturn> {
    if (
      this.activityState === ActivityState.Active ||
      this.activityState === ActivityState.Starting
    ) {
      const reason =
        'OpenReplay: trying to call `start()` on the instance that has been started already.'
      return Promise.resolve(UnsuccessfulStart(reason))
    }

    if (!document.hidden) {
      await this.waitStart()
      return this._start(...args)
    } else {
      return new Promise((resolve) => {
        const onVisibilityChange = async () => {
          if (!document.hidden) {
            await this.waitStart()
            // eslint-disable-next-line
            document.removeEventListener('visibilitychange', onVisibilityChange)
            resolve(this._start(...args))
          }
        }
        // eslint-disable-next-line
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
