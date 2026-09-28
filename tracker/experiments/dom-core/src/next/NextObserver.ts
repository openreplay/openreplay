/**
 * Experimental DOM core. Differences from the current Observer + Nodes + Maintainer:
 *
 *  - No id -> Node map. Each tracked node owns a tiny record (WeakMap or symbol slot)
 *    holding its id and a pointer to its *player-side* parent record. A node is live iff
 *    its record chain reaches the root without hitting a removed record or an old epoch.
 *    Removing a subtree = flag one record. Detached nodes/iframe documents are collected
 *    by the GC with no scan (no Maintainer) and no per-node unregister walk.
 *  - One MutationObserver for the top document, all same-origin iframe documents and all
 *    shadow roots: records arrive in one callback in global order, one commit per batch.
 *  - Sibling index is computed iteratively, walking both directions and stopping at the
 *    first end or at a memoized sibling (valid until the parent's player-side children
 *    change). Appends/prepends are O(1) regardless of list size, no recursion.
 *  - Moves are ordered safely: stale children (moved but not yet re-placed) are first
 *    parked at the end of their old parent when other placements target that parent,
 *    so numeric indexes stay correct for arbitrary reorders (player protocol unchanged).
 *  - Sanitize level lives on the record and is inherited through shadow roots.
 */
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
} from '../../../../tracker/src/main/app/messages.gen.js'
import type Message from '../../../../tracker/src/common/messages.gen.js'
import Sanitizer, { SanitizeLevel, stringWiper } from '../../../../tracker/src/main/app/sanitizer.js'
import {
  initUntaintedDom,
  parentNode,
  previousSibling,
  nextSibling,
  firstChild,
} from '../../../../tracker/src/main/app/untaintedDom.js'

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

class Rec {
  // player-side child count and a counter bumped on any child change (memo validity)
  n = 0
  mut = 0
  // memoized index among the parent's player children, valid while ix_mut === p.mut
  ix = -1
  ixMut = -1
  dead = false
  av = -1 // aliveGen when proven alive
  b = -1 // batch stamp for f / us / pc
  f = 0
  us = 0 // unplaced stale children (moved away but not re-placed yet)
  pc = 0 // placements into this parent other than its own stale children
  slot = 0
  constructor(
    public readonly id: number,
    public p: Rec | null,
    public readonly ep: number,
    public lvl: SanitizeLevel,
  ) {}
}

export interface NextOptions {
  captureIFrames: boolean
  obscureTextEmails: boolean
  obscureTextNumbers: boolean
  privateMode: boolean
  domSanitizer?: (node: Element) => SanitizeLevel
  /** where the per-node record lives */
  store: 'weakmap' | 'symbol'
  /** first id (crossdomain frames start at their packed block) */
  firstId: number
}

export interface NextDeps {
  send: (m: Message) => void
  sendSetAttribute: (id: number, name: string, value: string) => void
  getBaseHref: () => string
}

type NodeCb = (node: Node, id: number, isStart: boolean) => void

const PRESERVE_VALUE_INPUT_TYPES = new Set(['button', 'reset', 'submit', 'checkbox', 'radio'])

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

const isSVG = (el: Element) =>
  el.namespaceURI === 'http://www.w3.org/2000/svg' || el.localName === 'svg'

const nativeAttachShadow = typeof Element !== 'undefined' ? Element.prototype.attachShadow : null

export default class NextObserver {
  private readonly opts: NextOptions
  private readonly sanitizer: Sanitizer
  private readonly mo: MutationObserver
  private readonly wm = new WeakMap<Node, Rec>()
  private readonly sym = Symbol('or')
  private readonly closedShadows = new WeakMap<Element, ShadowRoot>()
  private readonly frameDocs = new WeakMap<Element, Document>()
  private readonly nodeCbs: NodeCb[] = []
  private docs: WeakRef<Document>[] = []
  private epoch = 0
  private aliveGen = 0
  private batch = 0
  private nextId = 0
  private root: Rec | null = null
  private active = false
  private approxTotal = 0

  // batch-local
  private removed: Node[] = []
  private added: Node[] = []
  private attrs = new Map<Node, Set<string>>()
  private texts = new Set<Node>()
  private pend: Node[] = []
  private fresh = new Set<Node>()
  private created: Node[] = []

  constructor(
    private readonly deps: NextDeps,
    options: Partial<NextOptions> = {},
  ) {
    this.opts = {
      captureIFrames: true,
      obscureTextEmails: true,
      obscureTextNumbers: false,
      privateMode: false,
      store: 'weakmap',
      firstId: 0,
      ...options,
    }
    this.sanitizer = new Sanitizer({ app: null as any, options: this.opts })
    this.mo = new MutationObserver(this.onRecords)
  }

  // ---- record store ----------------------------------------------------------------

  private get(node: Node): Rec | undefined {
    return this.opts.store === 'symbol' ? (node as any)[this.sym] : this.wm.get(node)
  }

  private set(node: Node, r: Rec) {
    if (this.opts.store === 'symbol') (node as any)[this.sym] = r
    else this.wm.set(node, r)
  }

  private alive(r: Rec): boolean {
    const gen = this.aliveGen
    let x: Rec | null = r
    while (x !== null) {
      if (x.dead || x.ep !== this.epoch) {
        for (let y: Rec | null = r; y !== x && y !== null; y = y.p) y.dead = true
        return false
      }
      if (x.av === gen) break
      x = x.p
    }
    for (let y: Rec | null = r; y !== x && y !== null; y = y.p) y.av = gen
    return true
  }

  private live(node: Node): Rec | undefined {
    const r = this.get(node)
    return r !== undefined && this.alive(r) ? r : undefined
  }

  private kill(r: Rec) {
    r.dead = true
    this.aliveGen++
  }

  // ---- public API --------------------------------------------------------------------

  onNode(cb: NodeCb) {
    this.nodeCbs.push(cb)
  }

  getID(node: Node): number | undefined {
    return this.live(node)?.id
  }

  /** Reverse lookup by scanning the tracked roots; meant for rare callers (assist). */
  getNode(id: number): Node | undefined {
    const found: Node[] = []
    const visit = (n: Node) => {
      if (found.length) return
      const r = this.get(n)
      if (r !== undefined && r.id === id && this.alive(r)) {
        found.push(n)
        return
      }
      for (let c = firstChild(n); c !== null; c = nextSibling(c)) visit(c)
      const sr = n.nodeType === ELEMENT ? this.shadowOf(n as Element) : null
      if (sr) visit(sr)
      if ((n as Element).localName === 'iframe') {
        const d = this.frameDocs.get(n as Element)
        if (d) visit(d)
      }
    }
    visit(document.documentElement)
    return found[0]
  }

  observe() {
    initUntaintedDom()
    this.active = true
    this.patchShadow()
    this.startTop()
  }

  disconnect() {
    this.active = false
    this.mo.disconnect()
    this.epoch++
    this.aliveGen++
    if (nativeAttachShadow) Element.prototype.attachShadow = nativeAttachShadow
    for (const ref of this.docs) {
      ref.deref()?.removeEventListener('load', this.onLoad, true)
    }
    this.docs = []
    this.resetBatch()
  }

  // ---- roots -------------------------------------------------------------------------

  private startTop() {
    this.epoch++
    this.aliveGen++
    this.nextId = this.opts.firstId
    this.approxTotal = 0
    this.mo.observe(document, MO_OPTS)
    this.listenDoc(document)
    this.deps.send(CreateDocument())
    const html = document.documentElement
    const r = this.newRec(html, null, this.sanitizer.computeLevel(html, SanitizeLevel.Plain))
    this.root = r
    this.batch++
    this.sendAttrs(r, html)
    for (let c = firstChild(html); c !== null; c = nextSibling(c)) this.collect(c)
    this.place()
    this.finish(true)
  }

  private rootSwapped() {
    const root = this.root
    const html = document.documentElement
    return !!html && !!root && this.get(html) !== root
  }

  private listenDoc(doc: Document) {
    doc.addEventListener('load', this.onLoad, true)
    this.docs.push(new WeakRef(doc))
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
      const host = self.live(this)
      if (host !== undefined && self.active) {
        self.batch++
        self.attachShadowRoot(host, sr)
        self.place()
        self.finish(false)
      }
      return sr
    }
  }

  private attachShadowRoot(host: Rec, sr: ShadowRoot) {
    if (host.lvl === SanitizeLevel.Hidden) return
    const existing = this.get(sr)
    if (existing !== undefined && this.alive(existing)) return
    const r = this.newRec(sr, host, host.lvl)
    this.deps.send(CreateIFrameDocument(host.id, r.id))
    this.mo.observe(sr, MO_OPTS)
    sr.addEventListener('slotchange', this.onSlotChange, true)
    for (let c = firstChild(sr); c !== null; c = nextSibling(c)) this.collect(c)
  }

  private attachFrame(host: Rec, iframe: HTMLIFrameElement) {
    if (host.lvl === SanitizeLevel.Hidden) return
    if (!this.opts.captureIFrames && !iframe.hasAttribute('data-openreplay-capture')) return
    if (iframe.hasAttribute('data-openreplay-obscured')) return
    let doc: Document | null = null
    try {
      doc = iframe.contentDocument
    } catch (e) {
      return
    }
    if (!doc || !doc.documentElement) return
    const prev = this.frameDocs.get(iframe)
    if (prev === doc) {
      const pr = this.get(doc)
      if (pr !== undefined && this.alive(pr)) return
    } else if (prev) {
      const pr = this.get(prev)
      if (pr !== undefined) this.kill(pr)
    }
    this.frameDocs.set(iframe, doc)
    const r = this.newRec(doc, host, SanitizeLevel.Plain)
    this.deps.send(CreateIFrameDocument(host.id, r.id))
    this.mo.observe(doc, MO_OPTS)
    this.listenDoc(doc)
    for (let c = firstChild(doc); c !== null; c = nextSibling(c)) this.collect(c)
  }

  private onLoad = (e: Event) => {
    const t = e.target as Element
    if (!this.active || !t || (t as Element).localName !== 'iframe') return
    const host = this.live(t)
    if (host === undefined) return
    this.batch++
    this.attachFrame(host, t as HTMLIFrameElement)
    this.place()
    this.finish(false)
  }

  private onSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement
    if (!this.active || slot.localName !== 'slot') return
    const sr = this.live(slot)
    if (sr === undefined) return
    for (const n of slot.assignedNodes({ flatten: true })) {
      const r = this.live(n)
      if (r !== undefined && r.slot !== sr.id) {
        r.slot = sr.id
        this.deps.send(SetNodeSlot(r.id, sr.id))
      }
    }
  }

  // ---- mutation intake -----------------------------------------------------------------

  private onRecords = (records: MutationRecord[]) => {
    if (!this.active) return
    this.batch++
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
    this.commit()
  }

  private commit() {
    for (let i = 0; i < this.added.length; i++) {
      const n = this.added[i]
      // added and then detached again within the batch: nothing to record
      if (n.isConnected) this.collect(n)
    }
    this.removeDetached()
    this.parkStale()
    this.place()
    this.flushUpdates()
    this.finish(false)
  }

  /** Preorder walk of a (possibly) new subtree; live records are moves and stop the descent. */
  private collect(start: Node) {
    let n: Node = start
    for (;;) {
      let descend = false
      if (!isIgnored(n)) {
        const r = this.get(n)
        if (r !== undefined && this.alive(r)) {
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
      const r = this.get(n)
      if (r === undefined || !this.alive(r)) continue
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
        this.deps.send(RemoveNode(r.id))
        const p = r.p as Rec
        p.n--
        p.mut++
        this.reportDrop(outNodes[i])
      }
    }
    for (let i = 0; i < out.length; i++) out[i].dead = true
    if (out.length) this.aliveGen++
  }

  private reportDrop(node: Node) {
    if (node.nodeType !== ELEMENT) return
    const size = 1 + (node as Element).getElementsByTagName('*').length
    const total = this.approxTotal
    this.approxTotal = Math.max(0, total - size)
    if (total > 0) {
      const pct = Math.floor((size / total) * 100)
      if (pct > 30) this.deps.send(UnbindNodes(pct))
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
      const r = this.get(pend[i])
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
      const pr = this.get(dp)
      if (pr === undefined || pr.b !== this.batch || pr.us === 0) continue
      const r = this.get(n)
      const ownStale = r !== undefined && r.b === this.batch && r.f & MOVED && r.p === pr
      if (!ownStale) pr.pc++
    }
    for (let i = 0; i < pend.length; i++) {
      const r = this.get(pend[i])
      if (r === undefined || r.b !== this.batch || !(r.f & STALE)) continue
      const op = r.p as Rec
      if (op.us >= 2 || op.pc > 0) {
        this.deps.send(MoveNode(r.id, op.id, op.n - 1))
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
    const pr = dp !== null ? this.live(dp) : undefined
    let r = this.get(n)
    const moved = r !== undefined && r.b === batch && (r.f & MOVED) !== 0 && !(r.f & PLACED)
    if (moved && !this.alive(r!)) {
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
    const lvl = this.sanitizer.computeLevel(n, pr.lvl)
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
      this.deps.send(MoveNode(mr.id, pr.id, ix))
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
    this.approxTotal++
    this.emitCreate(r, pr, ix, n)
    this.created.push(n)
  }

  private dropMoved(r: Rec) {
    const op = r.p as Rec
    this.deps.send(RemoveNode(r.id))
    if (r.f & STALE) op.us--
    op.n--
    op.mut++
    this.kill(r)
  }

  private positioned(s: Rec, pr: Rec) {
    return (
      s.p === pr &&
      !s.dead &&
      s.ep === this.epoch &&
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
      const ls = this.get(l)
      if (ls !== undefined && this.positioned(ls, pr)) {
        if (memo && ls.ixMut === pr.mut) return ls.ix + 1 + left
        left++
      }
      l = previousSibling(l)
      if (rt === null) {
        const stale = pr.b === this.batch ? pr.us : 0
        return pr.n - stale - right
      }
      const rs = this.get(rt)
      if (rs !== undefined && this.positioned(rs, pr)) right++
      rt = nextSibling(rt)
    }
  }

  private newRec(n: Node, p: Rec | null, lvl: SanitizeLevel): Rec {
    const r = new Rec(this.nextId++, p, this.epoch, lvl)
    this.set(n, r)
    return r
  }

  private emitCreate(r: Rec, pr: Rec, ix: number, n: Node) {
    if (n.nodeType === TEXT) {
      this.deps.send(CreateTextNode(r.id, pr.id, ix))
      this.sendText(r, n as Text)
    } else {
      let el = n as Element
      if (r.lvl === SanitizeLevel.Hidden) {
        const w = el.clientWidth
        const h = el.clientHeight
        el = n.cloneNode() as Element
        ;(el as HTMLElement).style.width = `${w}px`
        ;(el as HTMLElement).style.height = `${h}px`
      }
      this.deps.send(CreateElementNode(r.id, pr.id, ix, el.tagName, isSVG(n as Element)))
      this.sendAttrs(r, el)
      const sr = this.shadowOf(n as Element)
      if (sr !== null) this.attachShadowRoot(r, sr)
      if ((n as Element).localName === 'iframe') this.attachFrame(r, n as HTMLIFrameElement)
    }
    this.syncSlot(r, n)
  }

  private syncSlot(r: Rec, n: Node) {
    const slot = (n as Element | Text).assignedSlot
    if (slot) {
      const sr = this.live(slot)
      if (sr !== undefined && r.slot !== sr.id) {
        r.slot = sr.id
        this.deps.send(SetNodeSlot(r.id, sr.id))
      }
    } else if (r.slot !== 0) {
      r.slot = 0
      this.deps.send(SetNodeSlot(r.id, 0))
    }
  }

  private flushUpdates() {
    const batch = this.batch
    for (const [n, names] of this.attrs) {
      const r = this.live(n)
      if (r === undefined || (r.b === batch && r.f & FRESH) || n.nodeType !== ELEMENT) continue
      for (const name of names) {
        this.sendAttr(r.id, n as Element, name, (n as Element).getAttribute(name))
      }
    }
    for (const n of this.texts) {
      const r = this.live(n)
      if (r === undefined || (r.b === batch && r.f & FRESH) || n.nodeType !== TEXT) continue
      this.sendText(r, n as Text)
    }
  }

  private finish(isStart: boolean) {
    const created = this.created
    this.created = []
    this.resetBatch()
    if (this.nodeCbs.length) {
      for (const n of created) {
        const r = this.get(n)
        if (r === undefined) continue
        for (const cb of this.nodeCbs) cb(n, r.id, isStart)
      }
    }
  }

  private resetBatch() {
    this.removed.length = 0
    this.added.length = 0
    this.pend.length = 0
    this.attrs.clear()
    this.texts.clear()
    this.fresh.clear()
  }

  // ---- payload -------------------------------------------------------------------------

  private sendText(r: Rec, n: Text) {
    const parent = parentNode(n) as Element | null
    if (parent !== null && parent.localName === 'style') {
      this.deps.send(SetCSSDataURLBased(r.id, n.data, this.deps.getBaseHref()))
      return
    }
    this.deps.send(SetNodeData(r.id, this.sanitizeText(r.lvl, n.data)))
  }

  private sanitizeText(lvl: SanitizeLevel, data: string): string {
    if (lvl >= SanitizeLevel.Obscured) return stringWiper(data)
    if (this.opts.obscureTextNumbers) data = data.replace(/\d/g, '0')
    if (this.opts.obscureTextEmails) {
      data = data.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, (email) => {
        const at = email.lastIndexOf('@')
        const stars = (s: string) => '*'.repeat(s.length)
        return `${stars(email.slice(0, at))}@${email
          .slice(at + 1)
          .split('.')
          .map(stars)
          .join('.')}`
      })
    }
    return data
  }

  private sendAttrs(r: Rec, el: Element) {
    const attrs = el.attributes
    for (let i = 0; i < attrs.length; i++) {
      this.sendAttr(r.id, el, attrs[i].nodeName, attrs[i].value)
    }
  }

  // Same filtering rules as the current Observer.sendNodeAttribute (sprites/css inlining off).
  private sendAttr(id: number, node: Element, name: string, value: string | null) {
    if (isSVG(node)) {
      if (name.startsWith('xlink:')) name = name.substring(6)
      if (value === null) {
        this.deps.send(RemoveNodeAttribute(id, name))
        return
      }
      if (name === 'href') {
        if (value.length > 1e5) value = ''
        this.deps.send(SetNodeAttributeURLBased(id, name, value, this.deps.getBaseHref()))
      } else {
        this.deps.sendSetAttribute(id, name, value)
      }
      return
    }
    if (name === 'open' && node.localName === 'dialog') {
      let mode = 'closed'
      if (value !== null) {
        let modal = false
        try {
          modal = node.matches('dialog:modal')
        } catch (e) {}
        mode = modal ? 'modal' : 'nonmodal'
      }
      this.deps.send(SetNodeAttribute(id, '__openreplay_dialog', mode))
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
    if (
      name === 'value' &&
      node.localName === 'input' &&
      !PRESERVE_VALUE_INPUT_TYPES.has((node as HTMLInputElement).type)
    ) {
      return
    }
    if (value === null) {
      this.deps.send(RemoveNodeAttribute(id, name))
      return
    }
    if (name === 'style' || (name === 'href' && node.localName === 'link')) {
      this.deps.send(SetNodeAttributeURLBased(id, name, value, this.deps.getBaseHref()))
      return
    }
    if (name === 'href' || value.length > 1e5) value = ''
    if ((name === 'alt' || name === 'placeholder') && this.opts.privateMode) {
      value = value.replace(/./g, '*')
    }
    this.deps.sendSetAttribute(id, name, value)
  }
}

export { isIgnored }
