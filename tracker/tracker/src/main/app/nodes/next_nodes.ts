import { createEventListener, deleteEventListener } from '../../utils.js'
import { SanitizeLevel } from '../sanitizer.js'
import { pack, MASK_NODE } from './idSeq.js'
import type Nodes from './index.js'
import type { NodesOptions } from './index.js'

type NodeCallback = (node: Node, isStart: boolean) => void

/**
 * Per-node state of the next observer. `p` is the parent as the player knows it, so a
 * record is live iff its chain reaches a root without a removed record or an old epoch.
 */
export class Rec {
  /** player-side child count */
  n = 0
  /** bumped on any player-side change of the children order; validates `ix` memos */
  mut = 0
  ix = -1
  ixMut = -1
  dead = false
  /** aliveGen at which the chain was last proven live */
  av = -1
  /** batch stamp for f / us / pc */
  b = -1
  f = 0
  /** unplaced stale children (moved away in this batch, not re-placed yet) */
  us = 0
  /** placements into this parent other than its own stale children */
  pc = 0
  slot = 0
  constructor(
    public readonly id: number,
    public p: Rec | null,
    public readonly ep: number,
    public lvl: SanitizeLevel,
  ) {}
}

// Elements looked up by id (input polling, canvas scans, assist), plus every masked node
// so its sanitizer level can be forgotten once it is gone.
const INDEXED_TAGS = new Set(['input', 'textarea', 'select', 'canvas'])
const HAS_WEAKREF = typeof WeakRef === 'function'
const SWEEP_EVERY = 1000

interface ListenerEntry {
  type: string
  fn: EventListener
  capture: boolean
  /** id the node had when the listener was attached */
  id: number
}

/**
 * Nodes-compatible registry without an id -> Node map: removed nodes need no unregister
 * walk or Maintainer scan, the GC collects them. Reverse lookups go through a small weak
 * index; anything else falls back to a scan of the tracked roots.
 */
export default class NextNodes
  implements
    Pick<
      Nodes,
      | 'attachNodeCallback'
      | 'callNodeCallbacks'
      | 'getID'
      | 'getNode'
      | 'isBound'
      | 'attachNodeListener'
      | 'scanTree'
      | 'getNodeCount'
      | 'clear'
      | 'crossdomainMode'
    >
{
  private readonly slot = Symbol('openreplay-node')
  private readonly nodeCallbacks: NodeCallback[] = []
  private readonly forceNgOff: boolean
  private readonly onIdSpaceExhausted?: () => void
  private readonly onUnregister?: (id: number) => void
  private index = new Map<number, WeakRef<Node>>()
  // listeners live in a WeakMap keyed by their node: an entry (and the closure capturing the
  // node) can't keep the node alive; `listening` only lets clear() find them
  private listenersOf = new WeakMap<Node, ListenerEntry[]>()
  private listening: WeakRef<Node>[] = []
  private listeningPruneAt = 1024
  private sinceSweep = 0
  private firstId = 0
  private idLimit = Infinity
  private idSpaceExhausted = false

  epoch = 0
  /** bumped whenever a record dies, invalidating `av` memos */
  aliveGen = 0
  nextId = 0
  approxTotal = 0
  /** reverse lookup for ids missing from the index (set by the observer) */
  fallbackLookup: ((id: number) => Node | undefined) | null = null

  constructor(params: Pick<NodesOptions, 'forceNgOff' | 'onIdSpaceExhausted' | 'onUnregister'>) {
    this.forceNgOff = params.forceNgOff
    this.onIdSpaceExhausted = params.onIdSpaceExhausted
    this.onUnregister = params.onUnregister
  }

  // ---- records -----------------------------------------------------------------------

  rec(node: Node): Rec | undefined {
    return (node as any)[this.slot]
  }

  alive(r: Rec): boolean {
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

  live(node: Node): Rec | undefined {
    const r = this.rec(node)
    return r !== undefined && this.alive(r) ? r : undefined
  }

  kill(r: Rec) {
    r.dead = true
    this.aliveGen++
  }

  newRec(node: Node, p: Rec | null, lvl: SanitizeLevel): Rec {
    const id = this.nextId++
    if (id > this.idLimit && !this.idSpaceExhausted) {
      this.idSpaceExhausted = true
      this.onIdSpaceExhausted?.()
    }
    const r = new Rec(id, p, this.epoch, lvl)
    ;(node as any)[this.slot] = r
    if (lvl !== SanitizeLevel.Plain || INDEXED_TAGS.has((node as Element).localName)) {
      this.addToIndex(id, node)
    }
    return r
  }

  addToIndex(id: number, node: Node) {
    if (!HAS_WEAKREF) return
    this.index.set(id, new WeakRef(node))
    this.sinceSweep++
  }

  /** Drops index entries of nodes that are gone; called between batches. */
  maybeSweep() {
    if (this.sinceSweep < SWEEP_EVERY) return
    this.sinceSweep = 0
    for (const [id, ref] of this.index) {
      const node = ref.deref()
      if (node === undefined || this.live(node)?.id !== id) {
        this.index.delete(id)
        this.onUnregister?.(id)
      }
    }
  }

  private removeListeners(node: Node, list: ListenerEntry[], keepId: number | null) {
    const kept: ListenerEntry[] = []
    for (const l of list) {
      if (l.id === keepId) kept.push(l)
      else deleteEventListener(node, l.type, l.fn, l.capture, this.forceNgOff)
    }
    return kept
  }

  // ---- Nodes API ---------------------------------------------------------------------

  attachNodeCallback = (nodeCallback: NodeCallback): number => {
    return this.nodeCallbacks.push(nodeCallback)
  }

  callNodeCallbacks(node: Node, isStart: boolean): void {
    this.nodeCallbacks.forEach((cb) => cb(node, isStart))
  }

  getID(node: Node): number | undefined {
    if (!node) return undefined
    return this.live(node)?.id
  }

  isBound(node: Node): boolean {
    return !!node && this.live(node) !== undefined
  }

  getNode(id: number): Node | undefined {
    const node = this.index.get(id)?.deref()
    if (node !== undefined && this.live(node)?.id === id) {
      return node
    }
    return this.fallbackLookup?.(id)
  }

  /**
   * A listener only fires while its node keeps the id it was attached for. Listeners of a
   * previous registration are removed when the node gets new ones, the rest go with the node.
   */
  attachNodeListener = (
    node: Node,
    type: string,
    listener: EventListener,
    useCapture = true,
  ): void => {
    const id = this.getID(node)
    if (id === undefined) {
      return
    }
    let list = this.listenersOf.get(node)
    if (list === undefined) {
      list = []
      this.trackListening(node)
    } else if (list.length && list[0].id !== id) {
      list = this.removeListeners(node, list, id)
    }
    const nodes = this
    const fn = function (this: any, e: Event) {
      if (nodes.getID(node) === id) {
        return listener.call(this, e)
      }
    }
    createEventListener(node, type, fn, useCapture, this.forceNgOff)
    list.push({ type, fn, capture: useCapture, id })
    this.listenersOf.set(node, list)
  }

  private trackListening(node: Node) {
    if (!HAS_WEAKREF) return
    this.listening.push(new WeakRef(node))
    if (this.listening.length > this.listeningPruneAt) {
      this.listening = this.listening.filter((ref) => ref.deref() !== undefined)
      this.listeningPruneAt = Math.max(1024, this.listening.length * 2)
    }
  }

  /** Visits the indexed kinds only (form fields, canvases, masked nodes). */
  scanTree = (cb: (node: Node | void) => void) => {
    for (const [id, ref] of this.index) {
      const node = ref.deref()
      if (node !== undefined && this.live(node)?.id === id) cb(node)
    }
  }

  getNodeCount() {
    return this.approxTotal
  }

  crossdomainMode(level: number, frameOrder: number) {
    this.firstId = pack(level, frameOrder, 0)
    this.nextId = this.firstId
    this.idLimit = this.firstId + MASK_NODE
    this.idSpaceExhausted = false
  }

  /** Invalidates every record at once; ids restart from the frame's first id. */
  clear(): void {
    this.epoch++
    this.aliveGen++
    for (const ref of this.listening) {
      const node = ref.deref()
      const list = node && this.listenersOf.get(node)
      if (node && list) {
        this.removeListeners(node, list, null)
        this.listenersOf.delete(node)
      }
    }
    this.listening = []
    this.listeningPruneAt = 1024
    this.index = new Map()
    this.sinceSweep = 0
    this.nextId = this.firstId
    this.approxTotal = 0
  }

  /** Leaves crossdomain mode; called when the observer starts as a top document. */
  resetIdSpace() {
    this.firstId = 0
    this.nextId = 0
    this.idLimit = Infinity
    this.idSpaceExhausted = false
  }
}
