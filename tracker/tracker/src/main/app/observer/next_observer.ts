/**
 * Alternative DOM core, enabled with `nextObserver: true`. Same wire protocol and public
 * surface as TopObserver + Nodes; differs in how it keeps track of nodes:
 *
 *  - Liveness by structure (see NextNodes): removing a branch, an iframe or the document
 *    inside an iframe flags one record. No unregister walk, no Maintainer, the GC collects
 *    detached nodes and documents.
 *  - One MutationObserver for the top document, same-origin iframe documents and shadow
 *    roots: records arrive in one ordered callback and are committed once.
 *  - Sibling indexes are computed without recursion, from both ends and memoized; appends
 *    and prepends are O(1) regardless of list size.
 *  - Children moved away but not re-placed yet are parked at the end of their old parent
 *    before other placements into it, so numeric indexes stay correct for any reorder.
 *  - Privacy level lives on the record, is inherited through shadow roots, and a level
 *    change on move rebuilds the subtree. Hidden hosts get no shadow root or iframe.
 */
import type App from '../index.js'
import {
  CreateDocument,
  CreateElementNode,
  CreateTextNode,
  MoveNode,
  RemoveNode,
  RemoveNodeAttribute,
  SetNodeAttribute,
  SetNodeAttributeURLBased,
  SetNodeData,
  SetCSSDataURLBased,
  CreateIFrameDocument,
  SetNodeSlot,
  UnbindNodes,
  AdoptedSSInsertRuleURLBased,
  AdoptedSSAddOwner,
} from '../messages.gen.js'
import { SanitizeLevel } from '../sanitizer.js'
import { hasTag, isSVGElement, isUseElement } from '../guards.js'
import {
  createMutationObserver,
  throttleWithTrailing,
  hasOpenreplayAttribute,
  IN_BROWSER,
} from '../../utils.js'
import {
  initUntaintedDom,
  parentNode,
  previousSibling,
  nextSibling,
  firstChild,
} from '../untaintedDom.js'
import NextNodes, { Rec } from '../nodes/next_nodes.js'
import type { Offset } from './iframe_offsets.js'
import { parseUseEl, shouldSkipValueAttribute } from './observer.js'
import { inlineRemoteCss } from './cssInliner.js'
import { nextID } from '../../modules/constructedStyleSheets.js'
import type TopObserver from './top_observer.js'
import { getInlineOptions, Options } from './top_observer.js'

const ELEMENT = 1
const TEXT = 3

const MO_OPTS: MutationObserverInit = {
  childList: true,
  attributes: true,
  characterData: true,
  subtree: true,
}

// batch flags
const MOVED = 1
const PLACED = 2
const REMOVING = 4
const FRESH = 8
const STALE = 16

function isIgnored(node: Node): boolean {
  const t = node.nodeType
  if (t === TEXT) return false
  if (t !== ELEMENT) return true
  const tag = (node as Element).localName
  if (tag === 'link') {
    const rel = (node as Element).getAttribute('rel')
    const as = (node as Element).getAttribute('as')
    return !(rel?.includes('stylesheet') || as === 'style' || as === 'font')
  }
  return tag === 'script' || tag === 'noscript' || tag === 'meta' || tag === 'title' || tag === 'base'
}

const isStylesheetLink = (el: Element) => 'rel' in el && (el as HTMLLinkElement).rel === 'stylesheet'

type Context = Window & typeof globalThis
type ContextCallback = (context: Context) => void

interface FrameOffset {
  iframe: HTMLIFrameElement
  parent: Document
  offset: Offset | null
  gen: number
}

/**
 * Iframe offsets for mouse coordinates, cached until the parent document scrolls or
 * resizes. One listener per parent document (not per iframe), and state keyed by the
 * frame's document only, so removed iframes and their documents can be collected.
 */
class FrameOffsets {
  private states = new WeakMap<Document, FrameOffset>()
  private gens = new WeakMap<Document, number>()
  private listeners: Array<{ target: EventTarget; type: string; fn: () => void }> = []
  private listening = new WeakSet<Document>()

  observe(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument
    if (!doc) return
    const parent = iframe.ownerDocument
    this.states.set(doc, { iframe, parent, offset: null, gen: -1 })
    if (this.listening.has(parent)) return
    this.listening.add(parent)
    const bump = () => this.gens.set(parent, (this.gens.get(parent) ?? 0) + 1)
    parent.addEventListener('scroll', bump)
    this.listeners.push({ target: parent, type: 'scroll', fn: bump })
    const win = parent.defaultView
    if (win) {
      win.addEventListener('resize', bump)
      this.listeners.push({ target: win, type: 'resize', fn: bump })
    }
  }

  getDocumentOffset(doc: Document): Offset {
    const state = this.states.get(doc)
    if (!state) return [0, 0]
    const [parentLeft, parentTop] = this.getDocumentOffset(state.parent)
    const gen = this.gens.get(state.parent) ?? 0
    if (state.offset === null || state.gen !== gen) {
      const { left, top } = state.iframe.getBoundingClientRect()
      state.offset = [left, top]
      state.gen = gen
    }
    return [parentLeft + state.offset[0], parentTop + state.offset[1]]
  }

  clear() {
    for (const l of this.listeners) l.target.removeEventListener(l.type, l.fn)
    this.listeners = []
    this.states = new WeakMap()
    this.gens = new WeakMap()
    this.listening = new WeakSet()
  }
}

const nativeAttachShadow = IN_BROWSER ? Element.prototype.attachShadow : null

export default class NextObserver
  implements
    Pick<
      TopObserver,
      | 'observe'
      | 'disconnect'
      | 'crossdomainObserve'
      | 'attachContextCallback'
      | 'getDocumentOffset'
      | 'resanitizeSubtree'
    >
{
  private readonly app: App
  private readonly nodes: NextNodes
  private readonly options: Options
  private readonly inlineCss: boolean
  private readonly inlinerOptions: { forceFetch?: boolean; forcePlain?: boolean } | undefined
  private readonly throttling: boolean
  private readonly mo: MutationObserver
  private readonly domParser = IN_BROWSER ? new DOMParser() : (null as unknown as DOMParser)
  private readonly iframeOffsets = new FrameOffsets()
  private readonly contextCallbacks: ContextCallback[] = []
  /** marks a window global whose context callbacks already ran (a new global after navigation has none) */
  private readonly contextMark = Symbol('openreplay-context')
  private readonly closedShadows = new WeakMap<Element, ShadowRoot>()
  private readonly frameDocs = new WeakMap<Element, Document>()
  private listened: Array<{ ref: { deref(): EventTarget | undefined }; type: string; fn: EventListener }> = []
  /** iframe windows whose context callbacks run once the current batch is committed */
  private newContexts: Context[] = []
  private active = false
  /** false for a crossdomain child frame: its root is its document, not <html> */
  private top = true
  private root: Rec | null = null
  private batch = 0
  private inBatch = false
  private colorSchemeMQL: MediaQueryList | null = null
  /** bumped on disconnect so late async work (css inlining, sprites) of an old session bails */
  private generation = 0

  // batch-local
  private removed: Node[] = []
  private added: Node[] = []
  private attrs = new Map<Node, Set<string>>()
  private texts = new Set<Node>()
  private pend: Node[] = []
  private fresh = new Set<Node>()
  private created: Node[] = []
  /** iframe documents / shadow roots attached in this batch: their content is a snapshot (isStart) */
  private snapshotRoots = new Set<Rec>()

  constructor(params: { app: App; options: Partial<Options> }) {
    this.app = params.app
    this.nodes = params.app.nodes as unknown as NextNodes
    this.options = Object.assign(
      { captureIFrames: true, disableSprites: false, inlineCss: 0 },
      params.options,
    ) as Options
    const inline = getInlineOptions(this.options.inlineCss, console.warn)
    this.inlineCss = inline.inlineRemoteCss
    this.inlinerOptions = inline.inlinerOptions
    this.throttling = !this.options.disableThrottling
    this.mo = createMutationObserver(
      this.app.safe(this.onRecords) as MutationCallback,
      this.app.options.forceNgOff,
    )
    this.nodes.fallbackLookup = (id) => this.findNode(id)
  }

  // ---- public API ------------------------------------------------------------------------

  attachContextCallback(cb: ContextCallback) {
    this.contextCallbacks.push(cb)
  }

  getDocumentOffset(doc: Document): Offset {
    return this.iframeOffsets.getDocumentOffset(doc)
  }

  observe(): void {
    initUntaintedDom()
    this.active = true
    this.top = true
    this.patchShadow()
    this.throttledSetNodeData.clear()
    this.nodes.resetIdSpace()
    this.startTop()
    this.sendColorScheme()
    // "DOM parsed" signal: the worker finalizes the initial visual batch on it
    this.app.send(SetNodeAttribute(0, 'orloaded', 'true'))
    if (IN_BROWSER && window.matchMedia) {
      this.colorSchemeMQL = window.matchMedia('(prefers-color-scheme: dark)')
      this.colorSchemeMQL.addEventListener?.('change', this.onColorScheme)
    }
  }

  crossdomainObserve(rootNodeId: number, frameOrder: number, frameLevel: number) {
    initUntaintedDom()
    this.active = true
    this.top = false
    this.patchShadow()
    this.nodes.clear()
    this.nodes.crossdomainMode(frameLevel, frameOrder)
    this.app.sanitizer.clear()
    this.mo.observe(document, MO_OPTS)
    this.listen(document, 'load', this.onLoad)
    this.beginBatch()
    const r = this.newRec(document, null, SanitizeLevel.Plain)
    this.root = r
    this.app.send(CreateIFrameDocument(rootNodeId, r.id))
    this.created.push(document)
    for (let c = firstChild(document); c !== null; c = nextSibling(c)) this.collect(c)
    this.place()
    this.finish(true)
  }

  disconnect(): void {
    this.active = false
    this.mo.disconnect()
    if (nativeAttachShadow) Element.prototype.attachShadow = nativeAttachShadow
    for (const l of this.listened) {
      l.ref.deref()?.removeEventListener(l.type, l.fn, true)
    }
    this.listened = []
    this.colorSchemeMQL?.removeEventListener?.('change', this.onColorScheme)
    this.colorSchemeMQL = null
    this.iframeOffsets.clear()
    this.throttledSetNodeData.clear()
    this.generation++
    this.root = null
    this.resetBatch()
  }

  /**
   * Re-evaluates sanitization for every tracked node in `root`'s subtree against the
   * current DOM and re-emits whatever changed.
   */
  resanitizeSubtree(root: Node): void {
    if (!this.active || (isIgnored(root) && root.nodeType !== 9 && root.nodeType !== 11)) {
      return
    }
    this.flushRecords()
    const parent = parentNode(root)
    const parentLevel =
      parent !== null ? (this.nodes.live(parent)?.lvl ?? SanitizeLevel.Plain) : SanitizeLevel.Plain
    this.beginBatch()
    this.resanitizeNode(root, parentLevel)
    this.place()
    this.finish(false)
  }

  // ---- roots -----------------------------------------------------------------------------

  private startTop() {
    this.nodes.clear()
    this.app.sanitizer.clear()
    this.mo.observe(document, MO_OPTS)
    this.listen(document, 'load', this.onLoad)
    this.app.send(CreateDocument())
    this.app.nodes.callNodeCallbacks(document, true)
    const html = document.documentElement
    this.beginBatch()
    const r = this.newRec(html, null, this.app.sanitizer.computeLevel(html, SanitizeLevel.Plain))
    this.root = r
    this.sendAttrs(r, html)
    for (let c = firstChild(html); c !== null; c = nextSibling(c)) this.collect(c)
    this.place()
    this.finish(true)
  }

  private rootSwapped() {
    const html = document.documentElement
    return this.top && !!html && !!this.root && this.nodes.rec(html) !== this.root
  }

  private listen(target: EventTarget, type: string, fn: EventListener) {
    target.addEventListener(type, fn, true)
    const ref = typeof WeakRef === 'function' ? new WeakRef(target) : { deref: () => target }
    this.listened.push({ ref, type, fn })
  }

  private shadowOf(el: Element): ShadowRoot | null {
    return el.shadowRoot ?? this.closedShadows.get(el) ?? null
  }

  private patchShadow() {
    if (!nativeAttachShadow) return
    const self = this
    Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
      const sr = nativeAttachShadow.call(this, init)
      if (init && init.mode === 'closed') self.closedShadows.set(this, sr)
      // re-entrant calls (custom element constructors run by our own cloneNode) are
      // picked up when the host gets placed
      if (self.active && !self.inBatch) {
        self.app.safe(() => {
          const host = self.nodes.live(this)
          if (host === undefined) return
          self.flushRecords()
          self.beginBatch()
          self.attachShadowRoot(host, sr)
          self.place()
          self.finish(false)
        })()
      }
      return sr
    }
  }

  private attachShadowRoot(host: Rec, sr: ShadowRoot) {
    if (host.lvl === SanitizeLevel.Hidden) return
    const existing = this.nodes.rec(sr)
    if (existing !== undefined && this.nodes.alive(existing)) return
    const r = this.newRec(sr, host, host.lvl)
    this.app.send(CreateIFrameDocument(host.id, r.id))
    this.mo.observe(sr, MO_OPTS)
    this.listen(sr, 'slotchange', this.onSlotChange)
    this.created.push(sr)
    this.snapshotRoots.add(r)
    for (let c = firstChild(sr); c !== null; c = nextSibling(c)) this.collect(c)
  }

  private attachFrame(host: Rec, iframe: HTMLIFrameElement) {
    if (host.lvl === SanitizeLevel.Hidden) return
    const captured =
      (this.options.captureIFrames && !hasOpenreplayAttribute(iframe, 'obscured')) ||
      hasOpenreplayAttribute(iframe, 'capture')
    if (!captured) return
    let doc: Document | null = null
    try {
      doc = iframe.contentDocument
    } catch (e) {
      return
    }
    if (!doc || !doc.documentElement) return
    const prev = this.frameDocs.get(iframe)
    if (prev === doc) {
      const pr = this.nodes.rec(doc)
      if (pr !== undefined && this.nodes.alive(pr)) return
    } else if (prev) {
      const pr = this.nodes.rec(prev)
      if (pr !== undefined) this.nodes.kill(pr)
    }
    this.frameDocs.set(iframe, doc)
    const r = this.newRec(doc, host, SanitizeLevel.Plain)
    this.app.send(CreateIFrameDocument(host.id, r.id))
    this.mo.observe(doc, MO_OPTS)
    this.listen(doc, 'load', this.onLoad)
    this.iframeOffsets.observe(iframe)
    this.created.push(doc)
    this.snapshotRoots.add(r)
    for (let c = firstChild(doc); c !== null; c = nextSibling(c)) this.collect(c)
    const win = iframe.contentWindow as Context | null
    // a same-origin navigation may keep the global (initial about:blank) or create a new one
    if (win && win === win.window && !(win as any)[this.contextMark]) {
      ;(win as any)[this.contextMark] = true
      this.newContexts.push(win)
    }
  }

  private onLoad = (e: Event) => {
    const t = e.target as Element
    if (!this.active || !t || t.localName !== 'iframe' || this.inBatch) return
    this.app.safe(() => {
      const host = this.nodes.live(t)
      if (host === undefined) return
      this.flushRecords()
      this.beginBatch()
      this.attachFrame(host, t as HTMLIFrameElement)
      this.place()
      this.finish(false)
    })()
  }

  private onSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement
    if (!this.active || slot.localName !== 'slot') return
    const sr = this.nodes.live(slot)
    if (sr === undefined) return
    for (const n of slot.assignedNodes({ flatten: true })) {
      const r = this.nodes.live(n)
      if (r !== undefined && r.slot !== sr.id) {
        r.slot = sr.id
        this.app.send(SetNodeSlot(r.id, sr.id))
      }
    }
  }

  private onColorScheme = () => {
    this.app.safe(() => this.sendColorScheme())()
  }

  /** Resolved used color-scheme ('dark'|'light'|'normal') for the player to force on replay. */
  private sendColorScheme(): void {
    if (!IN_BROWSER) return
    const root = document.documentElement
    let declared = getComputedStyle(root).colorScheme
    if (!declared || declared === 'normal') {
      const meta = document.querySelector('meta[name="color-scheme" i]')
      const content = meta && meta.getAttribute('content')
      if (content) declared = content
    }
    let used = 'normal'
    if (declared && declared !== 'normal') {
      const prefersDark =
        !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      used =
        declared.includes('dark') && (prefersDark || !declared.includes('light')) ? 'dark' : 'light'
    }
    this.app.send(SetNodeAttribute(0, '__openreplay_color_scheme', used))
  }

  /** O(N) reverse lookup for ids outside the NextNodes index (e.g. assist targets). */
  private findNode(id: number): Node | undefined {
    let found: Node | undefined
    const visit = (n: Node) => {
      if (found !== undefined) return
      const r = this.nodes.rec(n)
      if (r !== undefined && r.id === id && this.nodes.alive(r)) {
        found = n
        return
      }
      for (let c = firstChild(n); c !== null && found === undefined; c = nextSibling(c)) visit(c)
      if (n.nodeType === ELEMENT) {
        const sr = this.shadowOf(n as Element)
        if (sr) visit(sr)
        const doc = this.frameDocs.get(n as Element)
        if (doc) visit(doc)
      }
    }
    if (this.root !== null && document.documentElement) visit(document)
    return found
  }

  // ---- mutation intake -------------------------------------------------------------------

  private flushRecords() {
    const pending = this.mo.takeRecords()
    if (pending.length) this.onRecords(pending)
  }

  private onRecords = (records: MutationRecord[]) => {
    if (!this.active) return
    this.beginBatch()
    for (let i = 0; i < records.length; i++) {
      const m = records[i]
      const t = m.target
      if (m.type === 'childList') {
        if (t === document && this.rootSwapped()) {
          this.resetBatch()
          this.startTop()
          return
        }
        const rm = m.removedNodes
        for (let j = 0; j < rm.length; j++) this.removed.push(rm[j])
        const ad = m.addedNodes
        for (let j = 0; j < ad.length; j++) this.added.push(ad[j])
      } else if (m.type === 'attributes') {
        const name = m.attributeName
        if (name === null) continue
        let set = this.attrs.get(t)
        if (set === undefined) this.attrs.set(t, (set = new Set()))
        set.add(name)
      } else {
        this.texts.add(t)
      }
    }
    for (let i = 0; i < this.added.length; i++) {
      const n = this.added[i]
      // added and detached again within the batch: nothing to record
      if (n.isConnected) this.collect(n)
    }
    this.removeDetached()
    this.parkStale()
    this.place()
    this.flushUpdates()
    this.finish(false)
  }

  private beginBatch() {
    this.batch++
    this.inBatch = true
  }

  /** Preorder walk of a (possibly) new subtree; live records are moves and stop the descent. */
  private collect(start: Node) {
    let n: Node = start
    for (;;) {
      let descend = false
      if (!isIgnored(n)) {
        const r = this.nodes.rec(n)
        if (r !== undefined && this.nodes.alive(r)) {
          if (r.b !== this.batch) {
            r.b = this.batch
            r.f = MOVED
            r.us = 0
            r.pc = 0
            this.pend.push(n)
          } else if (!(r.f & (MOVED | FRESH))) {
            r.f |= MOVED
            this.pend.push(n)
          }
        } else if (!this.fresh.has(n)) {
          this.fresh.add(n)
          this.pend.push(n)
          descend = true
        }
      }
      let next = descend ? firstChild(n) : null
      if (next !== null) {
        n = next
        continue
      }
      while (n !== start) {
        next = nextSibling(n)
        if (next !== null) break
        n = parentNode(n) as Node
      }
      if (n === start || next === null) return
      n = next
    }
  }

  private stamp(r: Rec) {
    if (r.b !== this.batch) {
      r.b = this.batch
      r.f = 0
      r.us = 0
      r.pc = 0
    }
  }

  private removeDetached() {
    const batch = this.batch
    const out: Rec[] = []
    const outNodes: Node[] = []
    for (let i = 0; i < this.removed.length; i++) {
      const n = this.removed[i]
      const r = this.nodes.rec(n)
      if (r === undefined || !this.nodes.alive(r)) continue
      if (r.b === batch && r.f & (MOVED | REMOVING)) continue
      this.stamp(r)
      r.f |= REMOVING
      out.push(r)
      outNodes.push(n)
    }
    for (let i = 0; i < out.length; i++) {
      const r = out[i]
      let covered = false
      for (let a = r.p; a !== null; a = a.p) {
        if (a.b === batch && a.f & REMOVING) {
          covered = true
          break
        }
      }
      if (!covered) {
        this.app.send(RemoveNode(r.id))
        const p = r.p as Rec
        p.n--
        p.mut++
        this.reportDrop(outNodes[i])
      }
    }
    for (let i = 0; i < out.length; i++) out[i].dead = true
    if (out.length) this.nodes.aliveGen++
  }

  /** Crash heuristic input for the backend: share of the DOM dropped by one removal. */
  private reportDrop(node: Node) {
    if (node.nodeType !== ELEMENT) return
    const size = 1 + (node as Element).getElementsByTagName('*').length
    const total = this.nodes.approxTotal
    this.nodes.approxTotal = Math.max(0, total - size)
    if (total > 0) {
      const pct = Math.floor((size / total) * 100)
      if (pct > 30) this.app.send(UnbindNodes(pct))
    }
  }

  /**
   * Numeric indexes break if a parent still holds, player-side, children that moved in
   * this batch but are not re-placed yet. When such a parent also receives other
   * placements, park its stale children at its end first.
   */
  private parkStale() {
    const pend = this.pend
    let anyStale = false
    for (let i = 0; i < pend.length; i++) {
      const r = this.nodes.rec(pend[i])
      if (r !== undefined && r.b === this.batch && r.f & MOVED) {
        const op = r.p as Rec
        if (op.dead) continue
        this.stamp(op)
        op.us++
        r.f |= STALE
        anyStale = true
      }
    }
    if (!anyStale) return
    for (let i = 0; i < pend.length; i++) {
      const n = pend[i]
      const dp = parentNode(n)
      if (dp === null) continue
      const pr = this.nodes.rec(dp)
      if (pr === undefined || pr.b !== this.batch || pr.us === 0) continue
      const r = this.nodes.rec(n)
      const ownStale = r !== undefined && r.b === this.batch && r.f & MOVED && r.p === pr
      if (!ownStale) pr.pc++
    }
    for (let i = 0; i < pend.length; i++) {
      const r = this.nodes.rec(pend[i])
      if (r === undefined || r.b !== this.batch || !(r.f & STALE)) continue
      const op = r.p as Rec
      if (op.us >= 2 || op.pc > 0) {
        this.app.send(MoveNode(r.id, op.id, op.n - 1))
        op.mut++
      }
    }
  }

  private place() {
    const pend = this.pend
    const chain: Node[] = []
    for (let i = 0; i < pend.length; i++) {
      const n = pend[i]
      // a node may land in a container that is itself pending further down the list
      // (inserted first, wrapped later): place the pending ancestors top-down first
      for (let a = parentNode(n); a !== null && this.fresh.has(a); a = parentNode(a)) chain.push(a)
      while (chain.length) this.placeOne(chain.pop() as Node)
      this.placeOne(n)
    }
  }

  private placeOne(n: Node) {
    const batch = this.batch
    const dp = parentNode(n)
    const pr = dp !== null ? this.nodes.live(dp) : undefined
    let r = this.nodes.rec(n)
    const moved = r !== undefined && r.b === batch && (r.f & MOVED) !== 0 && !(r.f & PLACED)
    if (moved && !this.nodes.alive(r!)) {
      // its old player-side ancestor was removed in this batch: recreate instead
      if (r!.f & STALE) (r!.p as Rec).us--
      r!.f &= ~(MOVED | STALE)
      this.collect(n)
      return
    }
    if (!moved && !this.fresh.has(n)) return
    if (pr === undefined || pr.lvl === SanitizeLevel.Hidden || isIgnored(n)) {
      if (moved) this.dropMoved(r!)
      else this.fresh.delete(n)
      return
    }
    const lvl = this.app.sanitizer.computeLevel(n, pr.lvl)
    if (moved) {
      const mr = r!
      if (lvl !== mr.lvl) {
        // level changed with the move: rebuild the subtree at the new level
        this.dropMoved(mr)
        mr.f &= ~(MOVED | STALE)
        this.collect(n)
        return
      }
      const op = mr.p as Rec
      const ix = this.indexOf(n, pr)
      if (mr.f & STALE) op.us--
      if (op !== pr) {
        op.n--
        op.mut++
        pr.n++
      }
      mr.p = pr
      mr.f |= PLACED
      this.app.send(MoveNode(mr.id, pr.id, ix))
      pr.mut++
      mr.ix = ix
      mr.ixMut = pr.mut
      this.syncSlot(mr, n)
      return
    }
    this.fresh.delete(n)
    const ix = this.indexOf(n, pr)
    r = this.newRec(n, pr, lvl)
    r.b = batch
    r.f = FRESH | PLACED
    pr.n++
    pr.mut++
    r.ix = ix
    r.ixMut = pr.mut
    // elements only, to match the removal side (getElementsByTagName)
    if (n.nodeType === ELEMENT) this.nodes.approxTotal++
    this.emitCreate(r, pr, ix, n)
    this.created.push(n)
  }

  private dropMoved(r: Rec) {
    const op = r.p as Rec
    this.app.send(RemoveNode(r.id))
    if (r.f & STALE) op.us--
    op.n--
    op.mut++
    this.nodes.kill(r)
  }

  private positioned(s: Rec, pr: Rec) {
    return (
      s.p === pr &&
      !s.dead &&
      s.ep === this.nodes.epoch &&
      !(s.b === this.batch && s.f & MOVED && !(s.f & PLACED))
    )
  }

  /** Index among the parent's current player-side children, walking out from `n`. */
  private indexOf(n: Node, pr: Rec): number {
    // an unparked stale child may still sit left of a memoized sibling player-side
    const memo = !(pr.b === this.batch && pr.us > 0)
    let left = 0
    let right = 0
    let l: Node | null = previousSibling(n)
    let rt: Node | null = nextSibling(n)
    for (;;) {
      if (l === null) return left
      const ls = this.nodes.rec(l)
      if (ls !== undefined && this.positioned(ls, pr)) {
        if (memo && ls.ixMut === pr.mut) return ls.ix + 1 + left
        left++
      }
      l = previousSibling(l)
      if (rt === null) {
        const stale = pr.b === this.batch ? pr.us : 0
        return pr.n - stale - right
      }
      const rs = this.nodes.rec(rt)
      if (rs !== undefined && this.positioned(rs, pr)) right++
      rt = nextSibling(rt)
    }
  }

  private newRec(n: Node, p: Rec | null, lvl: SanitizeLevel): Rec {
    const r = this.nodes.newRec(n, p, lvl)
    // modules ask the sanitizer by id; only non-plain levels are stored
    if (lvl !== SanitizeLevel.Plain) this.app.sanitizer.setLevel(r.id, lvl)
    return r
  }

  private emitCreate(r: Rec, pr: Rec, ix: number, n: Node) {
    if (n.nodeType === TEXT) {
      this.app.send(CreateTextNode(r.id, pr.id, ix))
      this.sendText(r.id, n as Text)
    } else {
      let el = n as Element
      if (r.lvl === SanitizeLevel.Hidden) {
        const w = el.clientWidth
        const h = el.clientHeight
        el = n.cloneNode() as Element
        ;(el as HTMLElement).style.width = `${w}px`
        ;(el as HTMLElement).style.height = `${h}px`
      }
      const tag = isStylesheetLink(el) && this.inlineCss ? 'STYLE' : el.tagName
      this.app.send(CreateElementNode(r.id, pr.id, ix, tag, isSVGElement(n as Element)))
      this.sendAttrs(r, el)
      const sr = this.shadowOf(n as Element)
      if (sr !== null) this.attachShadowRoot(r, sr)
      if (hasTag(n, 'iframe')) this.attachFrame(r, n)
      // light children are placed before the host's shadow content, so their slot
      // didn't exist yet when they were created
      if (hasTag(n, 'slot')) {
        for (const assigned of n.assignedNodes()) {
          const ar = this.nodes.live(assigned)
          if (ar !== undefined) this.syncSlot(ar, assigned)
        }
      }
    }
    this.syncSlot(r, n)
  }

  private syncSlot(r: Rec, n: Node) {
    const slot = (n as Element | Text).assignedSlot
    if (slot) {
      const sr = this.nodes.live(slot)
      if (sr !== undefined && r.slot !== sr.id) {
        r.slot = sr.id
        this.app.send(SetNodeSlot(r.id, sr.id))
      }
    } else if (r.slot !== 0) {
      r.slot = 0
      this.app.send(SetNodeSlot(r.id, 0))
    }
  }

  private flushUpdates() {
    const batch = this.batch
    for (const [n, names] of this.attrs) {
      const r = this.nodes.live(n)
      if (r === undefined || (r.b === batch && r.f & FRESH) || n.nodeType !== ELEMENT) continue
      for (const name of names) {
        this.sendAttr(r.id, n as Element, name, (n as Element).getAttribute(name))
      }
    }
    for (const n of this.texts) {
      const r = this.nodes.live(n)
      if (r === undefined || (r.b === batch && r.f & FRESH) || n.nodeType !== TEXT) continue
      this.sendText(r.id, n as Text)
    }
  }

  private finish(isStart: boolean) {
    const created = this.created
    const roots = this.snapshotRoots
    this.created = []
    this.snapshotRoots = new Set()
    this.resetBatch()
    for (const n of created) {
      const r = n === document ? undefined : this.nodes.live(n)
      if (n !== document && r === undefined) continue
      this.app.nodes.callNodeCallbacks(n, isStart || (roots.size > 0 && this.underRoot(r, roots)))
    }
    const contexts = this.newContexts
    this.newContexts = []
    for (const win of contexts) {
      this.contextCallbacks.forEach((cb) => cb(win))
    }
    this.nodes.maybeSweep()
  }

  private underRoot(r: Rec | undefined, roots: Set<Rec>) {
    for (let x = r ?? null; x !== null; x = x.p) {
      if (roots.has(x)) return true
    }
    return false
  }

  private resetBatch() {
    this.inBatch = false
    this.removed.length = 0
    this.added.length = 0
    this.pend.length = 0
    this.attrs.clear()
    this.texts.clear()
    this.fresh.clear()
  }

  // ---- resanitize ------------------------------------------------------------------------

  private resanitizeNode(node: Node, parentLevel: SanitizeLevel): void {
    if (isIgnored(node) && node.nodeType !== 9 && node.nodeType !== 11) return
    const r = this.nodes.live(node)
    // untracked: new or under a hidden ancestor, the live observer handles it
    if (r === undefined) return
    const newLevel = this.app.sanitizer.computeLevel(node, parentLevel)
    const wasHidden = r.lvl === SanitizeLevel.Hidden
    const willHidden = newLevel === SanitizeLevel.Hidden
    if (wasHidden !== willHidden && r.p !== null) {
      // crossing the hidden boundary changes the structure (placeholder vs subtree): rebuild
      const p = r.p
      this.app.send(RemoveNode(r.id))
      p.n--
      p.mut++
      this.nodes.kill(r)
      this.collect(node)
      return
    }
    if (willHidden) return
    if (r.lvl !== newLevel) {
      r.lvl = newLevel
      this.app.sanitizer.setLevel(r.id, newLevel)
      if (newLevel !== SanitizeLevel.Plain) this.nodes.addToIndex(r.id, node)
      if (node.nodeType === TEXT) {
        this.sendNodeData(r.id, parentNode(node) as Element, (node as Text).data)
      } else if (node.nodeType === ELEMENT) {
        // inputs/images/canvas re-emit their own payload via registered callbacks
        this.app.callResanitizeCallbacks(node, r.id)
      }
    }
    for (let c = firstChild(node); c !== null; c = nextSibling(c)) this.resanitizeNode(c, newLevel)
    if (node.nodeType === ELEMENT) {
      const sr = this.shadowOf(node as Element)
      if (sr) this.resanitizeNode(sr, newLevel)
    }
  }

  // ---- payload ---------------------------------------------------------------------------

  private throttledSetNodeData = throttleWithTrailing<number, [Element, string]>(
    (id, parentElement, data) => this.sendNodeData(id, parentElement, data),
    30,
  )

  private sendText(id: number, n: Text) {
    const parent = parentNode(n) as Element
    if (this.throttling) this.throttledSetNodeData(id, parent, n.data)
    else this.sendNodeData(id, parent, n.data)
  }

  private sendNodeData(id: number, parentElement: Element, data: string): void {
    if (parentElement && hasTag(parentElement, 'style')) {
      this.app.send(SetCSSDataURLBased(id, data, this.app.getBaseHref()))
      return
    }
    this.app.send(SetNodeData(id, this.app.sanitizer.sanitize(id, data)))
  }

  private sendAttrs(r: Rec, el: Element) {
    const attrs = el.attributes
    for (let i = 0; i < attrs.length; i++) {
      this.sendAttr(r.id, el, attrs[i].nodeName, attrs[i].value)
    }
  }

  // same rules as Observer.sendNodeAttribute
  private sendAttr(id: number, node: Element, name: string, value: string | null): void {
    if (isSVGElement(node)) {
      if (name.startsWith('xlink:')) {
        name = name.substring(6)
      }
      if (value === null) {
        this.app.send(RemoveNodeAttribute(id, name))
        return
      }
      if (isUseElement(node) && name === 'href' && !this.options.disableSprites) {
        const gen = this.generation
        parseUseEl(node, 'svgtext', this.domParser)
          .then((svgData) => {
            if (svgData && gen === this.generation) {
              this.app.send(SetNodeAttribute(id, name, `_$OPENREPLAY_SPRITE$_${svgData}`))
            }
          })
          .catch((e: any) => {
            console.error('Openreplay: Error parsing <use> element:', e)
          })
        return
      }
      if (name === 'href') {
        if (value.length > 1e5) {
          value = ''
        }
        this.app.send(SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()))
      } else {
        this.app.attributeSender.sendSetAttribute(id, name, value)
      }
      return
    }
    if (name === 'open' && hasTag(node, 'dialog')) {
      let mode: 'modal' | 'nonmodal' | 'closed'
      if (value === null) {
        mode = 'closed'
      } else {
        let isModal = false
        try {
          isModal = (node as HTMLDialogElement).matches('dialog:modal')
        } catch (e) {
          /* :modal pseudo-class unsupported on this browser */
        }
        mode = isModal ? 'modal' : 'nonmodal'
      }
      this.app.send(SetNodeAttribute(id, '__openreplay_dialog', mode))
    }
    if (
      name === 'src' ||
      name === 'srcset' ||
      name === 'integrity' ||
      name === 'crossorigin' ||
      name === 'autocomplete' ||
      name.substring(0, 2) === 'on'
    ) {
      return
    }
    if (name === 'value' && shouldSkipValueAttribute(node)) {
      return
    }
    if (value === null) {
      this.app.send(RemoveNodeAttribute(id, name))
      return
    }
    if (name === 'style' || (name === 'href' && hasTag(node, 'link'))) {
      if (isStylesheetLink(node) && this.inlineCss) {
        const gen = this.generation
        setTimeout(() => {
          inlineRemoteCss(
            node as HTMLLinkElement,
            id,
            this.app.getBaseHref(),
            nextID,
            ((sheetId: number, cssText: string, index: number, baseHref: string) => {
              if (this.generation !== gen) return
              this.app.send(AdoptedSSInsertRuleURLBased(sheetId, cssText, index, baseHref))
            }) as any,
            ((sheetId: number, ownerId: number) => {
              if (this.generation !== gen) return
              this.app.send(AdoptedSSAddOwner(sheetId, ownerId))
            }) as any,
            this.inlinerOptions?.forceFetch,
            this.inlinerOptions?.forcePlain,
            (cssText: string, fakeTextId: number) => {
              if (this.generation !== gen) return
              this.app.send(CreateTextNode(fakeTextId, id, 0))
              this.app.send(SetCSSDataURLBased(fakeTextId, cssText, this.app.getBaseHref()))
            },
          )
        }, 0)
        return
      }
      this.app.send(SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()))
      return
    }
    if (name === 'href' || value.length > 1e5) {
      value = ''
    }
    if ((name === 'alt' || name === 'placeholder') && this.app.sanitizer.privateMode) {
      value = value.replaceAll(/./g, '*')
    }
    this.app.attributeSender.sendSetAttribute(id, name, value)
  }
}
