import type {
  FromWorkerData,
  Options as WebworkerOptions,
  ToWorkerData,
} from '../../common/interaction.js'
import AttributeSender from '../modules/attributeSender.js'
import ConditionsManager from '../modules/conditionsManager.js'
import type { Options as NetworkOptions } from '../modules/network.js'
import { deviceMemory, jsHeapSizeLimit } from '../modules/performance.js'
import TagWatcher from '../modules/tagWatcher.js'
import type TagMatcher from '../modules/tagMatcher.js'
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
  ConsoleLog,
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
import { MASK_ORDER } from './nodes/idSeq.js'
import type { Options as ObserverOptions } from './observer/top_observer.js'
import Observer, { InlineCssMode } from './observer/top_observer.js'
import type { Options as SanitizerOptions } from './sanitizer.js'
import Sanitizer from './sanitizer.js'
import type { Options as SessOptions } from './session.js'
import Session from './session.js'
import Ticker from './ticker.js'
import { MaintainerOptions } from './nodes/maintainer.js'
export { InlineCssMode } from './observer/top_observer.js'

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
  projectKey: string
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
  | {
      line: 'reset-your-session-please'
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
  __local_debug?: boolean
  localStorage: Storage | null
  sessionStorage: Storage | null
  forceSingleTab?: boolean
  /** Sometimes helps to prevent session breaking due to dict reset */
  disableStringDict?: boolean
  assistSocketHost?: string
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
  // child -> parent: once-per-minute encoded debug snapshot from inside an iframe
  iframeDebug: 'iframe debug snapshot',
  // checking updates
  polling: 'hello-how-are-you-im-under-the-water-please-help-me',
  // happens if tab is old and has outdated token but
  // not communicating with backend to update it (for whatever reason)
  reset: 'reset-your-session-please',
} as const

/** reverse map proto value -> short readable key, for the crossdomain debug log */
const protoLabel: Record<string, string> = Object.fromEntries(
  Object.entries(proto).map(([k, v]) => [v, k]),
)

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
  public readonly options: Options
  public readonly networkOptions?: NetworkOptions
  private readonly revID: string
  private activityState: ActivityState = ActivityState.NotActive
  private readonly version = 'TRACKER_VERSION' // TODO: version compatability check inside each plugin.
  private worker?: TypedWorker

  public attributeSender: AttributeSender
  public socketMode = false
  private compressionThreshold = 24 * 1000
  private readonly bc: BroadcastChannel | null = null
  private readonly contextId: string
  private canvasRecorder: CanvasRecorder | null = null
  private conditionsManager: ConditionsManager | null = null
  private readonly tagWatcher: TagWatcher

  get tagMatcher(): TagMatcher {
    return this.tagWatcher.matcher
  }

  private canStart = false
  private rootId: number | null = null
  private pageFrames: HTMLIFrameElement[] = []
  private frameOderNumber = 0
  private frameLevel = 0
  private emptyBatchCounter = 0

  constructor(
    projectKey: string,
    sessionToken: string | undefined,
    options: Partial<Options>,
    private readonly signalError: (error: string, apis: string[]) => void,
    public readonly insideIframe: boolean,
  ) {
    this.contextId = Math.random().toString(36).slice(2)
    this.projectKey = projectKey

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
      __local_debug: false,
      localStorage: null,
      sessionStorage: null,
      forceSingleTab: false,
      assistSocketHost: '',
      captureIFrames: true,
      obscureTextEmails: false,
      obscureTextNumbers: false,
      disableStringDict: false,
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
      inlineCss: InlineCssMode.Unset,
      disableSprites: false,
      disableThrottling: false,
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
    this.observer = new Observer({ app: this, options })
    this.ticker = new Ticker(this)
    this.ticker.attach(() => this.commit())
    this.debug = new Logger(this.options.__debug__)
    this.session = new Session({ app: this, options: this.options })
    this.attributeSender = new AttributeSender({
      app: this,
      isDictDisabled: Boolean(this.options.disableStringDict || this.options.crossdomain?.enabled),
    })
    this.tagWatcher = new TagWatcher({
      sessionStorage: this.sessionStorage,
      errLog: this.debug.error,
      onTag: (tag) => this.send(TagTrigger(tag) as Message),
    })
    this.session.attachUpdateCallback(({ userID, metadata }) => {
      if (userID != null) {
        if (!userID || typeof userID !== 'string' || userID.trim().length === 0) {
          this.debug.warn('Invalid userID (must be type string), ignoring.')
          return
        }
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
      window.addEventListener('message', this.crossDomainIframeListener)
      setInterval(() => {
        window.parent.postMessage(
          {
            line: proto.polling,
            context: this.contextId,
          },
          options.crossdomain?.parentDomain ?? '*',
        )
        this.markSentToParent()
      }, 250)
      // Child-only: once per minute, post an encoded snapshot of our own tracking state
      // (active?, token received, last comms) up to the parent so it lands in the replay.
      if (this.iframeDebugInterval) clearInterval(this.iframeDebugInterval)
      this.iframeDebugInterval = setInterval(this.emitIframeDebug, 60_000)
    } else {
      this.initWorker()
      /**
       * if we get a signal from child iframes, we check for their node_id and send it back,
       * so they can act as if it was just a same-domain iframe
       * */
      window.addEventListener('message', this.crossDomainIframeListener)
      // Parent-only: once per minute, log an encoded snapshot of every tracked child
      // iframe and the freshness of our two-way comms, to debug iframes that go silent.
      if (this.options.crossdomain?.enabled) {
        if (this.xdomainDebugInterval) clearInterval(this.xdomainDebugInterval)
        this.xdomainDebugInterval = setInterval(this.emitCrossdomainDebug, 60_000)
      }
    }
    if (this.bc !== null) {
      this.bc.postMessage({
        line: proto.ask,
        source: thisTab,
        context: this.contextId,
        projectKey: this.projectKey,
      })
      this.startTimeout = setTimeout(() => {
        this.allowAppStart()
      }, 250)
      this.bc.onmessage = (ev: MessageEvent<RickRoll>) => {
        if (ev.data.context === this.contextId || this.projectKey !== ev.data.projectKey) {
          this.debug.log('same ctx event', ev)
          return
        }
        this.debug.log(ev)
        if (ev.data.line === proto.resp) {
          const sessionToken = ev.data.token
          this.session.setSessionToken(sessionToken, this.projectKey)
          this.allowAppStart()
        }
        if (ev.data.line === proto.reg) {
          const sessionToken = ev.data.token
          this.session.regenerateTabId()
          this.session.setSessionToken(sessionToken, this.projectKey)
          this.allowAppStart()
        }
        if (ev.data.line === proto.ask) {
          const token = this.session.getSessionToken(this.projectKey)
          if (token && this.bc) {
            this.bc.postMessage({
              line: ev.data.source === thisTab ? proto.reg : proto.resp,
              token,
              source: thisTab,
              context: this.contextId,
              projectKey: this.projectKey,
            })
          }
        }
        if (ev.data.line === proto.reset) {
          const newToken = ev.data.token
          this.debug.log('Received reset signal from another tab')
          this.session.setSessionToken(newToken, this.projectKey)
          this.restart()
        }
      }
    }
  }

  /** used by child iframes for crossdomain only */
  parentActive = false
  checkStatus = () => {
    return this.parentActive
  }

  /** child-side crossdomain debug state (only meaningful when insideIframe) */
  private lastTokenReceived: { tok: string; at: number } | null = null
  private lastParentMsgAt = 0
  private lastSentToParentAt = 0
  private iframeDebugInterval: ReturnType<typeof setInterval> | null = null
  /** stamp every outbound post to the parent window, for the child debug snapshot */
  private markSentToParent() {
    this.lastSentToParentAt = Date.now()
  }

  /**
   * Child-side counterpart of emitCrossdomainDebug: once per minute an iframe posts an
   * encoded snapshot of its own tracking state up to the parent, which records it as a
   * console log. Posted directly (not via this.send) so it is reported even when the
   * child is NOT active — an inactive/orphaned child is exactly what we want to catch.
   */
  private emitIframeDebug = () => {
    if (!this.insideIframe || !this.options.crossdomain?.enabled) return
    const now = Date.now()
    const rel = (t: number) => (t ? now - t : null)
    const payload = {
      ctx: this.contextId,
      active: this.active(),
      state: ActivityState[this.activityState],
      parentActive: this.parentActive,
      rootId: this.rootId,
      frameOrder: this.frameOderNumber,
      // when and what token we last received from the parent (token truncated)
      token: this.lastTokenReceived
        ? { tok: this.lastTokenReceived.tok, agoMs: now - this.lastTokenReceived.at }
        : null,
      // last two-way communication with the parent
      lastParentMsgAgoMs: rel(this.lastParentMsgAt),
      lastSentToParentAgoMs: rel(this.lastSentToParentAt),
    }
    const json = JSON.stringify(payload)
    let encoded: string
    try {
      encoded = btoa(json)
    } catch {
      encoded = json
    }
    try {
      window.parent.postMessage(
        { line: proto.iframeDebug, context: this.contextId, debug: encoded },
        this.options.crossdomain?.parentDomain ?? '*',
      )
      this.markSentToParent()
    } catch (e) {
      this.debug.error('iframe debug post failed', e)
    }
  }
  parentCrossDomainFrameListener = (event: MessageEvent) => {
    const { data } = event
    if (!data || event.source === window) return
    // Debug: remember the last time the parent talked to us.
    if (
      data.line === proto.startIframe ||
      data.line === proto.parentAlive ||
      data.line === proto.iframeId ||
      data.line === proto.killIframe
    ) {
      this.lastParentMsgAt = Date.now()
    }
    if (data.line === proto.startIframe) {
      // Avoid corrupting an in-flight start; let it complete.
      if (this.activityState === ActivityState.Starting) return
      try {
        if (this.active()) {
          this.stop()
        }
        if (data.token) {
          this.session.setSessionToken(data.token as string, this.projectKey)
          this.lastTokenReceived = { tok: String(data.token).slice(-8), at: Date.now() }
        }
        if (data.id !== undefined) {
          this.rootId = data.id
        }
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
      this.session.setSessionToken(data.token as string, this.projectKey)
      this.lastTokenReceived = { tok: String(data.token).slice(-8), at: Date.now() }
      this.frameOderNumber = data.frameOrderNumber
      this.frameLevel = data.frameLevel
      this.debug.log('starting iframe tracking', data)
      this.allowAppStart()
    }
    if (data.line === proto.killIframe) {
      if (this.active()) {
        this.stop()
      }
    }
  }

  trackedFrames: string[] = []
  /** every context that has been enrolled at least once, to tell an orphan (re-adopt) apart
   *  from a brand-new child still mid-enrollment (leave alone). */
  private everTrackedFrames: Set<string> = new Set()
  private frameLastSeen: Map<string, number> = new Map()
  /** crossdomain debug diagnostics, reported once per minute as an encoded console log */
  private frameOrigin: Map<string, string> = new Map()
  private frameAnyLastSeen: Map<string, number> = new Map()
  private frameBatchLastSeen: Map<string, number> = new Map()
  private frameLastSent: Map<string, { line: string; t: number }> = new Map()
  private xdomainDebugInterval: ReturnType<typeof setInterval> | null = null
  /** last time we re-adopted a given orphaned context, to avoid restart spam */
  private reAdoptCooldown: Map<string, number> = new Map()
  private readonly RE_ADOPT_COOLDOWN_MS = 2000

  /**
   * Stable, collision-free frame-order allocation. Node ids are partitioned by
   * (frameLevel, frameOrder) via pack() — every (level, order) owns its own id block, so
   * two simultaneously-live frames sharing an order at the same level corrupt each other's
   * node trees and one stops rendering. The previous `trackedFrames.findIndex+1` derived
   * order from a mutable array index, and pruneStaleFrames()'s .filter() shifts those
   * indices, so a newly enrolled frame could be handed an order still in use by a live
   * (but pruned) frame. We instead assign each context a persistent order, unique among all
   * non-recycled contexts at its level, freed only when the context is GC'd (truly gone).
   */
  private frameAlloc: Map<string, { order: number; level: number }> = new Map()
  private usedOrdersByLevel: Map<number, Set<number>> = new Map()
  private allocateFrameOrder(ctx: string, level: number): number {
    const existing = this.frameAlloc.get(ctx)
    if (existing !== undefined) return existing.order
    let used = this.usedOrdersByLevel.get(level)
    if (!used) {
      used = new Set()
      this.usedOrdersByLevel.set(level, used)
    }
    let order = -1
    for (let n = 1; n <= MASK_ORDER; n++) {
      if (!used.has(n)) {
        order = n
        break
      }
    }
    if (order === -1) {
      // Overflow (>127 live frames at one level): evict the least-recently-seen context at
      // this level that is not currently tracked, and reuse its slot rather than failing.
      let lru: string | null = null
      let lruSeen = Infinity
      const trackedSet = new Set(this.trackedFrames)
      this.frameAlloc.forEach((alloc, c) => {
        if (alloc.level !== level || trackedSet.has(c)) return
        const seen = this.frameAnyLastSeen.get(c) ?? 0
        if (seen < lruSeen) {
          lruSeen = seen
          lru = c
        }
      })
      if (lru !== null) {
        order = this.frameAlloc.get(lru)!.order
        this.frameAlloc.delete(lru)
        this.debug.error('OR: frame order space exhausted, evicting', lru, 'for', ctx)
      } else {
        order = MASK_ORDER
        this.debug.error('OR: frame order overflow, reusing max order for', ctx)
      }
    }
    used.add(order)
    this.frameAlloc.set(ctx, { order, level })
    return order
  }
  private freeFrameOrder(ctx: string) {
    const alloc = this.frameAlloc.get(ctx)
    if (!alloc) return
    this.frameAlloc.delete(ctx)
    this.usedOrdersByLevel.get(alloc.level)?.delete(alloc.order)
  }
  private readonly FRAME_STALE_MS = 1500
  private pruneStaleFrames() {
    const staleAfter = Date.now() - this.FRAME_STALE_MS
    this.trackedFrames = this.trackedFrames.filter((ctx) => {
      const last = this.frameLastSeen.get(ctx)
      if (last !== undefined && last >= staleAfter) return true
      this.frameLastSeen.delete(ctx)
      return false
    })
  }

  /** records the last command/signal we posted to a given child iframe context (debug) */
  private recordSentToFrame(ctx: string | undefined, line: string) {
    if (!ctx) return
    this.frameLastSent.set(ctx, { line: protoLabel[line] ?? line, t: Date.now() })
  }

  /**
   * Self-heal for the "kill-then-prune orphan" race: a live child can fall out of
   * `trackedFrames` (its 250ms poll was delayed past FRAME_STALE_MS during the parent's
   * stop/start NotActive gap, so pruneStaleFrames evicted it). It keeps polling but the
   * only re-enrollment path is an `iframeSignal`, which a stopped/active-but-orphaned
   * child never re-emits — so it would record nothing forever. When we (the parent) are
   * active and see a poll from an un-tracked context, push a `startIframe` so the child
   * restarts, re-runs the full handshake and re-observes with a fresh rootId. Cooldowned
   * so we don't spam restarts during the child's start window.
   */
  private reAdoptOrphanFrame(event: MessageEvent, ctx: string) {
    const now = Date.now()
    const last = this.reAdoptCooldown.get(ctx) ?? 0
    if (now - last < this.RE_ADOPT_COOLDOWN_MS) return
    this.reAdoptCooldown.set(ctx, now)
    const message: Record<string, any> = {
      line: proto.startIframe,
      token: this.session.getSessionToken(this.projectKey),
    }
    const targetFrame =
      this.pageFrames.find((f) => f.contentWindow === event.source) ||
      Array.from(document.querySelectorAll('iframe')).find((f) => f.contentWindow === event.source)
    if (targetFrame) {
      const nodeId = (targetFrame as any)[this.options.node_id]
      if (nodeId !== undefined) {
        message.id = nodeId
      }
    }
    // @ts-ignore
    event.source?.postMessage(message, '*')
    this.recordSentToFrame(ctx, proto.startIframe)
    this.debug.log('Re-adopting orphaned crossdomain iframe', ctx)
  }

  /**
   * Once per minute: emit an encoded console log from the parent tracker describing every
   * tracked child iframe and the freshness of our two-way communication with it. Lets us
   * see in replay which crossdomain iframe went silent and on which leg of the handshake.
   */
  /** drop debug entries for contexts we have neither heard from nor messaged in this long */
  private readonly XDOMAIN_DEBUG_RETENTION_MS = 10 * 60_000
  private emitCrossdomainDebug = () => {
    if (this.insideIframe || !this.options.crossdomain?.enabled || !this.active()) return
    const now = Date.now()
    const rel = (t: number | undefined) => (t === undefined ? null : now - t)
    // Report the union of currently-tracked frames and every context we have any debug
    // record for: a frame that broke and stopped polling gets pruned from trackedFrames,
    // but it is exactly the one we want to surface (with a large lastAnyMsgAgoMs).
    const tracked = new Set(this.trackedFrames)
    const contexts = new Set<string>([
      ...this.trackedFrames,
      ...this.frameAnyLastSeen.keys(),
      ...this.frameLastSent.keys(),
    ])
    const frames = Array.from(contexts).map((ctx, i) => {
      const sent = this.frameLastSent.get(ctx)
      const alloc = this.frameAlloc.get(ctx)
      return {
        // the actual allocated (level, order) node-id partition, else an enumeration index
        n: alloc ? alloc.order : i + 1,
        level: alloc ? alloc.level : null,
        // identify by domain if we have it, otherwise the context id, otherwise the number
        id: this.frameOrigin.get(ctx) || ctx || `#${i + 1}`,
        tracked: tracked.has(ctx),
        lastAnyMsgAgoMs: rel(this.frameAnyLastSeen.get(ctx)),
        lastBatchAgoMs: rel(this.frameBatchLastSeen.get(ctx)),
        lastSent: sent ? { line: sent.line, agoMs: now - sent.t } : null,
      }
    })
    // GC: forget contexts that have been silent and un-messaged past the retention window.
    const cutoff = now - this.XDOMAIN_DEBUG_RETENTION_MS
    for (const ctx of contexts) {
      if (tracked.has(ctx)) continue
      const seen = this.frameAnyLastSeen.get(ctx) ?? 0
      const sentT = this.frameLastSent.get(ctx)?.t ?? 0
      if (Math.max(seen, sentT) < cutoff) {
        this.frameOrigin.delete(ctx)
        this.frameAnyLastSeen.delete(ctx)
        this.frameBatchLastSeen.delete(ctx)
        this.frameLastSent.delete(ctx)
        this.reAdoptCooldown.delete(ctx)
        this.everTrackedFrames.delete(ctx)
        this.freeFrameOrder(ctx)
      }
    }
    const payload = { t: now, count: frames.length, frames }
    const json = JSON.stringify(payload)
    let encoded: string
    try {
      // payload is ASCII (base36 contexts, URL origins, numbers), so plain base64 is safe
      encoded = btoa(json)
    } catch {
      encoded = json
    }
    this.send(ConsoleLog('info', `[OR_XDOMAIN_DEBUG] ${encoded}`))
  }
  crossDomainIframeListener = (event: MessageEvent) => {
    if (event.source === window) return
    const { data } = event
    if (!data) return
    // Debug: remember when we last heard *anything* from this context, and its domain.
    if (data.context) {
      this.frameAnyLastSeen.set(data.context, Date.now())
      if (event.origin && !this.frameOrigin.has(data.context)) {
        this.frameOrigin.set(data.context, event.origin)
      }
    }
    // Record liveness regardless of our own active state so the queue can prune
    // stale contexts reliably once we resume dispatching commands after a cycle.
    if ((data.line === proto.polling || data.line === proto.iframeSignal) && data.context) {
      this.frameLastSeen.set(data.context, Date.now())
    }
    if (!this.active()) return
    if (data.line === proto.iframeDebug) {
      // A child posted its once-per-minute snapshot; surface it in our recorded console.
      this.send(ConsoleLog('info', `[OR_XDOMAIN_IFRAME_DEBUG] ${data.debug as string}`))
      return
    }
    if (data.line === proto.iframeSignal) {
      // @ts-ignore
      event.source?.postMessage({ ping: true, line: proto.parentAlive }, '*')
      this.recordSentToFrame(data.context, proto.parentAlive)
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
          this.everTrackedFrames.add(data.context)
          await this.waitStarted()
          const token = this.session.getSessionToken(this.projectKey)
          // Persistent, collision-free order (NOT the shifting array index). A restart of the
          // same context keeps its order/id-block for continuity; distinct live frames at the
          // same level never share one.
          const frameLevel = this.frameLevel + 1
          const order = this.allocateFrameOrder(data.context, frameLevel)
          const iframeData = {
            line: proto.iframeId,
            id,
            token,
            frameOrderNumber: order,
            frameLevel,
          }
          this.debug.log('Got child frame signal; nodeId', id, event.source, iframeData)
          // @ts-ignore
          event.source?.postMessage(iframeData, '*')
          this.recordSentToFrame(data.context, proto.iframeId)
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
      if (data.context) {
        this.frameBatchLastSeen.set(data.context, Date.now())
      }
      const msgBatch = data.messages
      const mappedMessages: Message[] = []
      msgBatch.forEach((msg: Message) => {
        if (msg[0] === MType.MouseMove) {
          let fixedMessage = msg
          this.pageFrames.forEach((frame) => {
            if (frame.contentWindow === event.source) {
              const [type, x, y] = msg
              const { left, top } = frame.getBoundingClientRect()
              fixedMessage = [type, x + left, y + top]
            }
          })
          mappedMessages.push(fixedMessage)
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
          mappedMessages.push(fixedMessage)
        }
        if (![MType.UserID, MType.UserAnonymousID, MType.Metadata].includes(msg[0])) {
          mappedMessages.push(msg)
        }
      })
      this.messages.push(...mappedMessages)
    }
    if (data.line === proto.polling) {
      // Self-heal: a live child that was enrolled before but fell out of trackedFrames
      // (pruned during a stop/start gap) keeps polling yet never re-signals. Re-adopt it
      // so it restarts and re-enrolls. We require everTrackedFrames so a brand-new child
      // still mid-enrollment (iframeSignal/checkNodeId in flight) is left alone.
      if (
        data.context &&
        this.everTrackedFrames.has(data.context) &&
        !this.trackedFrames.includes(data.context)
      ) {
        this.reAdoptOrphanFrame(event, data.context)
        return
      }
      if (!this.pollingQueue.order.length) {
        return
      }
      this.pruneStaleFrames()
      const liveSet = new Set(this.trackedFrames)
      while (this.pollingQueue.order.length > 0) {
        const head = this.pollingQueue.order[0]
        this.pollingQueue[head] = this.pollingQueue[head].filter((ctx: string) => liveSet.has(ctx))
        if (this.pollingQueue[head].length === 0) {
          delete this.pollingQueue[head]
          this.pollingQueue.order.shift()
        } else {
          break
        }
      }
      if (!this.pollingQueue.order.length) {
        return
      }
      const nextCommand = this.pollingQueue.order[0]
      if (this.pollingQueue[nextCommand].includes(data.context)) {
        this.pollingQueue[nextCommand] = this.pollingQueue[nextCommand].filter(
          (c: string) => c !== data.context,
        )
        const message: Record<string, any> = { line: nextCommand }
        if (nextCommand === proto.startIframe) {
          message.token = this.session.getSessionToken(this.projectKey)
          const targetFrame = this.pageFrames.find((f) => f.contentWindow === event.source)
            || Array.from(document.querySelectorAll('iframe')).find((f) => f.contentWindow === event.source)
          if (targetFrame) {
            const nodeId = (targetFrame as any)[this.options.node_id]
            if (nodeId !== undefined) {
              message.id = nodeId
            }
          }
        }
        // @ts-ignore
        event.source?.postMessage(message, '*')
        this.recordSentToFrame(data.context, nextCommand)
        if (this.pollingQueue[nextCommand].length === 0) {
          delete this.pollingQueue[nextCommand]
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
    this.pruneStaleFrames()
    if (this.pollingQueue[cmd]) {
      this.pollingQueue[cmd] = Array.from(
        new Set([...this.pollingQueue[cmd], ...this.trackedFrames]),
      )
      return
    }
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
    this.markSentToParent()

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
      this.markSentToParent()
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

      let closing = false
      const alertWorker = () => {
        if (closing) {
          return
        }
        closing = true
        setTimeout(() => {
          closing = false
        }, 500)

        if (this.worker) {
          this.worker.postMessage('closing')
        }
      }
      this.attachEventListener(document.body, 'mouseleave', alertWorker, false, false)
      this.attachEventListener(window, 'pagehide', alertWorker, false, false)
      // TODO: stop session after inactivity timeout (make configurable)
      this.attachEventListener(
        document,
        'visibilitychange',
        (e) => document.visibilityState === 'hidden' && alertWorker(),
        false,
      )
    } catch (e) {
      this._debug('worker_start', e)
    }
  }

  private restart = () => {
    this.stop(false)
    this.waitStatus(ActivityState.NotActive).then(() => {
      this.allowAppStart()
      this.start(this.prevOpts, true)
        .then((r) => {
          this.debug.info('Session restart', r)
        })
        .catch((e) => {
          this.debug.error('Session restart failed', e)
        })
    })
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
      const dataType = data.dataType
      // split is a decompressed-byte offset, so it survives gzip unchanged.
      const split = data.split
      const batchSize = batch.byteLength
      const hasCompressionAPI = 'CompressionStream' in globalThis
      if (batchSize > this.compressionThreshold && hasCompressionAPI) {
        const blob = new Blob([batch as BlobPart])
        const stream = blob.stream().pipeThrough(new CompressionStream('gzip'))
        new Response(stream)
          .arrayBuffer()
          .then((compressedBuffer) => {
            this.worker?.postMessage({
              type: 'compressed',
              batch: new Uint8Array(compressedBuffer),
              dataType,
              split,
            })
          })
          .catch((err) => {
            this.debug.error('Openreplay compression error:', err)
            this.worker?.postMessage({ type: 'uncompressed', batch: batch, dataType, split })
          })
      } else {
        this.worker?.postMessage({ type: 'uncompressed', batch: batch, dataType, split })
      }
    } else if (data.type === 'local_save') {
      const blob = new Blob([data.batch as BlobPart], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.name
      a.click()
      URL.revokeObjectURL(url)
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
          context: this.contextId,
        },
        this.options.crossdomain?.parentDomain ?? '*',
      )
      this.markSentToParent()
      this.commitCallbacks.forEach((cb) => cb(this.messages))
      this.messages.length = 0
      return
    }

    if (this.worker === undefined) {
      return
    }

    if (!this.messages.length) {
      // Send a keepalive batch every ~30s (1000 * 30ms) to keep the session active
      if (this.emptyBatchCounter < 1000) {
        this.emptyBatchCounter++
        return
      }
      // Keepalive: send just Timestamp + TabData so the session stays alive
      this.emptyBatchCounter = 0
      try {
        this.worker?.postMessage([Timestamp(this.timestamp()), TabData(this.session.getTabId())])
      } catch (e) {
        this._debug('worker_keepalive', e)
      }
      return
    }

    this.emptyBatchCounter = 0

    try {
      requestIdleCb(() => {
        if (!this.messages.length) {
          return
        }
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
    return this.session.getSessionToken(this.projectKey)
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
    const PROTO_VERSION = "2";
    const versionHash = `${PROTO_VERSION}x${this.version}`
    const needReset = this.sessionStorage.getItem(this.options.session_reset_key) !== null
    let needNewSessionID = forceNew || needReset
    const sessionToken = this.session.getSessionToken(this.projectKey)
    if (sessionToken) {
      const storedVersion = this.sessionStorage.getItem(`${this.options.session_token_key}_version`)
      needNewSessionID = !storedVersion || storedVersion !== versionHash
      this.sessionStorage.setItem(`${this.options.session_token_key}_version`, versionHash)
    }
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
      localDebug: this.options.__local_debug,
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
      protocolVersion: offlineProtocolVersion,
    } = await r.json()
    this.worker?.postMessage({
      type: 'auth',
      token,
      beaconSizeLimit,
      protocolVersion: offlineProtocolVersion,
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
    this.postToWorker([[-1]] as unknown as Message[])
    this.clearBuffers()
  }

  prevOpts: StartOptions = {}
  private userStartCallback?: NonNullable<StartOptions['startCallback']>
  private async _start(
    startOpts: StartOptions = {},
    resetByWorker = false,
    conditionName?: string,
  ): Promise<StartPromiseReturn> {
    if (Object.keys(startOpts).length !== 0) {
      this.prevOpts = startOpts
    }
    if (startOpts.startCallback) {
      this.userStartCallback = startOpts.startCallback
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
    const userId = startOpts.userID ? startOpts.userID.trim() : undefined
    this.session.assign({
      // MBTODO: maybe it would make sense to `forceNew` if the `userID` was changed
      userID: userId || undefined,
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
      localDebug: this.options.__local_debug,
    })

    const sessionToken = this.session.getSessionToken(this.projectKey)
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
          bufferDiff: this.coldStartTs ? timestamp - this.coldStartTs : 0,
          userID: this.session.getInfo().userID,
          token: isNewSession ? undefined : sessionToken,
          deviceMemory,
          jsHeapSizeLimit,
          timezone: getTimezone(),
          condition: conditionName,
          assistOnly: startOpts.assistOnly ?? this.socketMode,
          width: window.screen.width,
          height: window.screen.height,
          referrer: document.referrer,
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
        framesSupport,
        assistOnly: socketOnly,
        protocolVersion,
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
        return UnsuccessfulStart(reason)
      }

      this.delay = delay
      this.session.setSessionToken(token, this.projectKey)
      if (sessionToken && sessionToken !== token) {
        this.bc?.postMessage({
          type: proto.reset,
          token: token,
        })
      }
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
          protocolVersion,
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
      if (this.userStartCallback) {
        this.userStartCallback(SuccessfulStart(onStartInfo))
      }
      this.activityState = ActivityState.Active
      if (this.options.crossdomain?.enabled) {
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
            framesSupport: !!framesSupport,
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
      }
      if (this.insideIframe && this.rootId) {
        this.observer.crossdomainObserve(this.rootId, this.frameOderNumber, this.frameLevel)
      } else {
        this.observer.observe()
      }
      this.ticker.start()
      this.canvasRecorder?.startTracking()
      void this.tagWatcher.fetchTags(this.options.ingestPoint, token)

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
        if (this.options.crossdomain?.enabled) {
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
        this.pageFrames = []
      } finally {
        this.activityState = ActivityState.NotActive
        this.debug.log('OpenReplay tracking stopped.')
      }
    }
  }
}
