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
import Nodes from './nodes/index.js'
import type { Options as ObserverOptions } from './observer/top_observer.js'
import Observer, { InlineCssMode } from './observer/top_observer.js'
import type { Options as SanitizerOptions } from './sanitizer.js'
import Sanitizer from './sanitizer.js'
import type { Options as SessOptions } from './session.js'
import Session from './session.js'
import Ticker from './ticker.js'
import { MaintainerOptions } from './nodes/maintainer.js'

interface TypedWorker extends Omit<Worker, 'postMessage'> {
  postMessage(data: ToWorkerData): void
}

interface InlineOptions {
  inlineRemoteCss: boolean
  inlinerOptions: {
    forceFetch: boolean,
    forcePlain: boolean
    ,
  },
}

// TODO: Unify and clearly describe options logic
export interface StartOptions {
  userID?: string
  metadata?: Record<string, string>
  forceNew?: boolean
  sessionHash?: string
  assistOnly?: boolean
  /**
   * @deprecated We strongly advise to use .start().then instead.
   *
   * This method is kept for snippet compatibility only
   * */
  startCallback?: (result: StartPromiseReturn) => void
}

interface OnStartInfo {
  sessionID: string
  sessionToken: string
  userUUID: string
}

/**
 * this value is injected during build time via rollup
 * */
// @ts-ignore
const workerBodyFn = global.WEBWORKER_BODY
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
  /**
   * use this flag to force angular detection to be offline
   *
   * basically goes around window.Zone api changes to mutation observer
   * and event listeners
   * */
  forceNgOff?: boolean
  /**
   * This option is used to change how tracker handles potentially detached nodes
   *
   * defaults here are tested and proven to be lightweight and easy on cpu
   *
   * consult the docs before changing it
   * */
  nodes?: {
    maintainer: Partial<MaintainerOptions>
  }
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

function getInlineOptions(mode: InlineCssMode): InlineOptions {
  switch (mode) {
    case InlineCssMode.RemoteOnly:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: false,
          forcePlain: false,
        },
      }
    case InlineCssMode.RemoteWithForceFetch:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: true,
          forcePlain: false,
        },
      };
    case InlineCssMode.All:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: true,
          forcePlain: true,
        },
      };
    case InlineCssMode.None:
    default:
      return {
        inlineRemoteCss: false,
        inlinerOptions: {
          forceFetch: false,
          forcePlain: false,
        },
      };
  }
}

const proto = {
  // ask if there are any tabs alive
  ask: 'never-gonna-give-you-up',
  // response from another tab
  resp: 'never-gonna-let-you-down',
  // regenerating id (copied other tab)
  reg: 'never-gonna-run-around-and-desert-you',
  iframeSignal: 'tracker inside a child iframe',
  iframeId: 'getting node id for child iframe',
  iframeBatch: 'batch of messages from an iframe window',
  parentAlive: 'signal that parent is live',
  killIframe: 'stop tracker inside frame',
  startIframe: 'start tracker inside frame',
  // checking updates
  polling: 'hello-how-are-you-im-under-the-water-please-help-me',
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
  private features = {
    'feature-flags': true,
    'usability-test': true,
  }
  private emptyBatchCounter = 0
  private inlineCss: {
    inlineRemoteCss: boolean
    inlinerOptions: {
      forceFetch: boolean
      forcePlain: boolean
    }
  }

  constructor(
    projectKey: string,
    sessionToken: string | undefined,
    options: Partial<Options>,
    private readonly signalError: (error: string, apis: string[]) => void,
    public readonly insideIframe: boolean,
  ) {
    this.contextId = Math.random().toString(36).slice(2)
    this.projectKey = projectKey

    this.inlineCss = getInlineOptions(options.inlineCss ?? 0)

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
      disableStringDict: true,
      forceSingleTab: false,
      assistSocketHost: '',
      fixedCanvasScaling: false,
      disableCanvas: false,
      captureIFrames: true,
      disableSprites: false,
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
      forceNgOff: false,
      inlineCss: 0,
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
    } else if (this.options.forceSingleTab) {
      this.allowAppStart()
    }

    this.revID = this.options.revID
    this.localStorage = this.options.localStorage ?? window.localStorage
    this.sessionStorage = this.options.sessionStorage ?? window.sessionStorage
    this.sanitizer = new Sanitizer({ app: this, options })
    this.nodes = new Nodes({
      node_id: this.options.node_id,
      forceNgOff: Boolean(options.forceNgOff),
      maintainer: this.options.nodes?.maintainer,
    })
    this.observer = new Observer({ app: this, options: { ...options, ...this.inlineCss } })
    this.ticker = new Ticker(this)
    this.ticker.attach(() => this.commit())
    this.debug = new Logger(this.options.__debug__)
    this.session = new Session({ app: this, options: this.options })
    this.attributeSender = new AttributeSender({
      app: this,
      isDictDisabled: Boolean(this.options.disableStringDict || this.options.crossdomain?.enabled),
    })
    this.featureFlags = new FeatureFlags(this)
    this.tagWatcher = new TagWatcher({
      sessionStorage: this.sessionStorage,
      errLog: this.debug.error,
      onTag: (tag) => this.send(TagTrigger(tag) as Message),
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

    const thisTab = this.session.getTabId()

    if (this.insideIframe) {
      /**
       * listen for messages from parent window, so we can signal that we're alive
       * */
      window.addEventListener('message', this.parentCrossDomainFrameListener)
      setInterval(() => {
        if (document.hidden) {
          return
        }
        window.parent.postMessage(
          {
            line: proto.polling,
            context: this.contextId,
          },
          options.crossdomain?.parentDomain ?? '*',
        )
      }, 250)
    } else {
      this.initWorker()
      /**
       * if we get a signal from child iframes, we check for their node_id and send it back,
       * so they can act as if it was just a same-domain iframe
       * */
      window.addEventListener('message', this.crossDomainIframeListener)
    }
    if (this.bc !== null) {
      this.bc.postMessage({
        line: proto.ask,
        source: thisTab,
        context: this.contextId,
      })
      this.startTimeout = setTimeout(() => {
        this.allowAppStart()
      }, 250)
      this.bc.onmessage = (ev: MessageEvent<RickRoll>) => {
        if (ev.data.context === this.contextId) {
          return
        }
        this.debug.log(ev)
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

  /** used by child iframes for crossdomain only */
  parentActive = false
  checkStatus = () => {
    return this.parentActive
  }
  parentCrossDomainFrameListener = (event: MessageEvent) => {
    const { data } = event
    if (!data || event.source === window) return
    if (data.line === proto.startIframe) {
      if (this.active()) return
      try {
        this.allowAppStart()
        void this.start()
      } catch (e) {
        console.error('children frame restart failed:', e)
      }
    }
    if (data.line === proto.parentAlive) {
      this.parentActive = true
    }
    if (data.line === proto.iframeId) {
      this.parentActive = true
      this.rootId = data.id
      this.session.setSessionToken(data.token as string)
      this.frameOderNumber = data.frameOrderNumber
      this.debug.log('starting iframe tracking', data)
      this.allowAppStart()
    }
    if (data.line === proto.killIframe) {
      if (this.active()) {
        this.stop()
      }
    }
  }

  /**
   * context ids for iframes,
   * order is not so important as long as its consistent
   * */
  trackedFrames: string[] = []
  crossDomainIframeListener = (event: MessageEvent) => {
    if (!this.active() || event.source === window) return
    const { data } = event
    if (!data) return
    if (data.line === proto.iframeSignal) {
      // @ts-ignore
      event.source?.postMessage({ ping: true, line: proto.parentAlive }, '*')
      const signalId = async () => {
        if (event.source === null) {
          return console.error('Couldnt connect to event.source for child iframe tracking')
        }
        const id = await this.checkNodeId(event.source)
        if (!id) {
          this.debug.log('Couldnt get node id for iframe', event.source)
          return
        }
        try {
          if (this.trackedFrames.includes(data.context)) {
            this.debug.log('Trying to observe already added iframe; ignore if its a restart')
          } else {
            this.trackedFrames.push(data.context)
          }
          await this.waitStarted()
          const token = this.session.getSessionToken()
          const order = this.trackedFrames.findIndex((f) => f === data.context) + 1
          if (order === 0) {
            this.debug.error(
              'Couldnt get order number for iframe',
              data.context,
              this.trackedFrames,
            )
          }
          const iframeData = {
            line: proto.iframeId,
            id,
            token,
            // since indexes go from 0 we +1
            frameOrderNumber: order,
          }
          this.debug.log('Got child frame signal; nodeId', id, event.source, iframeData)
          // @ts-ignore
          event.source?.postMessage(iframeData, '*')
        } catch (e) {
          console.error(e)
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
            if (frame.contentWindow === event.source) {
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
            if (frame.contentWindow === event.source) {
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
    if (data.line === proto.polling) {
      if (!this.pollingQueue.order.length) {
        return
      }
      const nextCommand = this.pollingQueue.order[0]
      if (nextCommand && this.pollingQueue[nextCommand].length === 0) {
        this.pollingQueue.order = this.pollingQueue.order.filter((c: any) => c !== nextCommand)
        return
      }
      if (this.pollingQueue[nextCommand].includes(data.context)) {
        this.pollingQueue[nextCommand] = this.pollingQueue[nextCommand].filter(
          (c: string) => c !== data.context,
        )
        // @ts-ignore
        event.source?.postMessage({ line: nextCommand }, '*')
        if (this.pollingQueue[nextCommand].length === 0) {
          this.pollingQueue.order.shift()
        }
      }
    }
  }

  /**
   * { command : [remaining iframes] }
   * + order of commands
   **/
  pollingQueue: Record<string, any> = {
    order: [],
  }
  private readonly addCommand = (cmd: string) => {
    this.pollingQueue.order.push(cmd)
    this.pollingQueue[cmd] = [...this.trackedFrames]
  }

  public bootChildrenFrames = async () => {
    await this.waitStarted()
    this.addCommand(proto.startIframe)
  }

  public killChildrenFrames = () => {
    this.addCommand(proto.killIframe)
  }

  signalIframeTracker = () => {
    const thisTab = this.session.getTabId()
    window.parent.postMessage(
      {
        line: proto.iframeSignal,
        source: thisTab,
        context: this.contextId,
      },
      this.options.crossdomain?.parentDomain ?? '*',
    )

    /**
     * since we need to wait uncertain amount of time
     * and I don't want to have recursion going on,
     * we'll just use a timeout loop with backoff
     * */
    const maxRetries = 10
    let retries = 0
    let delay = 250
    let cumulativeDelay = 0
    let stopAttempts = false

    const checkAndSendMessage = () => {
      if (stopAttempts || this.checkStatus()) {
        stopAttempts = true
        return
      }
      window.parent.postMessage(
        {
          line: proto.iframeSignal,
          source: thisTab,
          context: this.contextId,
        },
        this.options.crossdomain?.parentDomain ?? '*',
      )
      this.debug.info('Trying to signal to parent, attempt:', retries + 1)
      retries++
    }

    for (let i = 0; i < maxRetries; i++) {
      if (this.checkStatus()) {
        stopAttempts = true
        break
      }
      cumulativeDelay += delay
      setTimeout(() => {
        checkAndSendMessage()
      }, cumulativeDelay)
      delay *= 1.5
    }
  }

  startTimeout: ReturnType<typeof setTimeout> | null = null
  public allowAppStart() {
    this.canStart = true
    if (this.startTimeout) {
      clearTimeout(this.startTimeout)
      this.startTimeout = null
    }
  }

  private async checkNodeId(source: MessageEventSource): Promise<number | null> {
    let targetFrame
    if (this.pageFrames.length > 0) {
      targetFrame = this.pageFrames.find((frame) => frame.contentWindow === source)
    }
    if (!targetFrame || !this.pageFrames.length) {
      const pageIframes = Array.from(document.querySelectorAll('iframe'))
      this.pageFrames = pageIframes
      targetFrame = pageIframes.find((frame) => frame.contentWindow === source)
    }

    if (!targetFrame) {
      return null
    }
    /**
     * Here we're trying to get node id from the iframe (which is kept in observer)
     * because of async nature of dom initialization, we give 100 retries with 100ms delay each
     * which equals to 10 seconds. This way we have a period where we give app some time to load
     * and tracker some time to parse the initial DOM tree even on slower devices
     * */
    let tries = 0
    while (tries < 100) {
      // @ts-ignore
      const potentialId = targetFrame[this.options.node_id]
      if (potentialId !== undefined) {
        tries = 100
        return potentialId
      } else {
        tries++
        await delay(100)
      }
    }

    return null
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        URL.createObjectURL(new Blob([workerBodyFn], { type: 'text/javascript' })),
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
      this.waitStatus(ActivityState.NotActive).then(() => {
        this.allowAppStart()
        this.start(this.prevOpts, true)
          .then((r) => {
            this.debug.info('Worker restart, session too long', r)
          })
          .catch((e) => {
            this.debug.error('Worker restart failed', e)
          })
      })
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

  send = (message: Message, urgent = false): void => {
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
      this.messages.unshift(Timestamp(this.timestamp()), TabData(this.session.getTabId()))
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
      return
    }

    if (this.insideIframe) {
      window.parent.postMessage(
        {
          line: proto.iframeBatch,
          messages: this.messages,
        },
        this.options.crossdomain?.parentDomain ?? '*',
      )
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
      return
    }

    if (this.worker === undefined || !this.messages.length) {
      return
    }

    if (!this.messages.length) {
      // Release empty batches every 30 secs (1000 * 30ms)
      if (this.emptyBatchCounter < 1000) {
        this.emptyBatchCounter++;
        return;
      }
    }

    this.emptyBatchCounter = 0

    try {
      requestIdleCb(() => {
        this.messages.unshift(Timestamp(this.timestamp()), TabData(this.session.getTabId()))
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
      const payload = [Timestamp(this.timestamp()), TabData(this.session.getTabId())]
      this.bufferedMessages1.push(...payload)
      this.bufferedMessages2.push(...payload)
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

  attachStartCallback = (cb: StartCallback, useSafe = false): void => {
    if (useSafe) {
      cb = this.safe(cb)
    }
    this.startCallbacks.push(cb)
  }

  attachStopCallback = (cb: () => any, useSafe = false): void => {
    if (useSafe) {
      cb = this.safe(cb)
    }
    this.stopCallbacks.push(cb)
  }

  attachEventListener = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    useSafe = true,
    useCapture = true,
  ): void => {
    if (useSafe) {
      listener = this.safe(listener)
    }

    const createListener = () =>
      target
        ? createEventListener(target, type, listener, useCapture, this.options.forceNgOff)
        : null
    const deleteListener = () =>
      target
        ? deleteEventListener(target, type, listener, useCapture, this.options.forceNgOff)
        : null

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
        width: window.screen.width,
        height: window.screen.height,
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
      features,
    } = await r.json()
    this.features = features ? features : this.features
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
    if (this.features['feature-flags']) {
      await this.featureFlags.reloadFlags(token as string)
      this.conditionsManager?.processFlags(this.featureFlags.flags)
    }
    await this.tagWatcher.fetchTags(this.options.ingestPoint, token as string)
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

  prevOpts: StartOptions = {}
  private async _start(
    startOpts: StartOptions = {},
    resetByWorker = false,
    conditionName?: string,
  ): Promise<StartPromiseReturn> {
    if (Object.keys(startOpts).length !== 0) {
      this.prevOpts = startOpts
    }
    const isColdStart = this.activityState === ActivityState.ColdStart
    if (isColdStart && this.coldInterval) {
      clearInterval(this.coldInterval)
    }
    if (!this.worker && !this.insideIframe) {
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
    this.worker?.postMessage({
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
          width: window.screen.width,
          height: window.screen.height,
        }),
      })
      if (r.status !== 200) {
        const error = await r.text()
        const reason = error === CANCELED ? CANCELED : `Server error: ${r.status}. ${error}`
        return UnsuccessfulStart(reason)
      }
      if (!this.worker && !this.insideIframe) {
        const reason = 'no worker found after start request (this should not happen in real world)'
        this.signalError(reason, [])
        return UnsuccessfulStart(reason)
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
        features,
      } = await r.json()
      this.features = features ? features : this.features
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
        return UnsuccessfulStart(reason)
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
        this.worker?.postMessage('stop')
      } else {
        this.worker?.postMessage({
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
      if (startOpts.startCallback) {
        startOpts.startCallback(SuccessfulStart(onStartInfo))
      }
      if (this.features['feature-flags']) {
        void this.featureFlags.reloadFlags()
      }
      await this.tagWatcher.fetchTags(this.options.ingestPoint, token)
      this.activityState = ActivityState.Active
      if (this.options.crossdomain?.enabled && !this.insideIframe) {
        void this.bootChildrenFrames()
      }

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
      this.canvasRecorder?.startTracking()

      if (this.features['usability-test'] && !this.insideIframe) {
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
      }

      return SuccessfulStart(onStartInfo)
    } catch (reason) {
      this.stop()
      this.session.reset()
      if (!reason) {
        console.error('Unknown error during start')
        this.signalError('Unknown error', [])
        return UnsuccessfulStart('Unknown error')
      }
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
    return new Promise((res, reject) => {
      if (buffer.length === 0) {
        res(null)
        return
      }

      // Since the first element is always a Timestamp, include it by default.
      let endIndex = 1
      while (endIndex < buffer.length && buffer[endIndex][0] !== MType.Timestamp) {
        endIndex++
      }

      requestIdleCb(() => {
        try {
          const messagesBatch = buffer.splice(0, endIndex)

          // Cast out potential proxy objects (produced from vue.js deep reactivity, for example) to a regular array.
          this.postToWorker(messagesBatch.map((x) => [...x]))

          res(null)
        } catch (e) {
          this._debug('flushBuffer', e)
          reject(new Error('flushBuffer failed'))
        }
      })
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
      const int = setInterval(() => {
        if (this.canStart) {
          clearInterval(int)
          resolve(true)
        }
      }, 100)
    })
  }

  async waitStarted() {
    return this.waitStatus(ActivityState.Active)
  }

  async waitStatus(status: ActivityState) {
    return new Promise((resolve) => {
      const check = () => {
        if (this.activityState === status) {
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

    if (this.insideIframe) {
      this.signalIframeTracker()
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
        if (!this.insideIframe && this.options.crossdomain?.enabled) {
          this.killChildrenFrames()
        }
        this.attributeSender.clear()
        this.sanitizer.clear()
        this.observer.disconnect()
        this.nodes.clear()
        this.ticker.stop()
        this.stopCallbacks.forEach((cb) => cb())
        this.tagWatcher.clear()
        if (this.worker && stopWorker) {
          this.worker.postMessage('stop')
        }
        this.canvasRecorder?.clear()
        this.messages.length = 0
        this.parentActive = false
      } finally {
        this.activityState = ActivityState.NotActive
        this.debug.log('OpenReplay tracking stopped.')
      }
    }
  }
}
