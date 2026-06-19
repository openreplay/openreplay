const SECOND = 1000

function processMapInBatches(
  map: Map<number, Node | void>,
  batchSize: number,
  processBatchCallback: (node: Node) => void,
  // reports the pending inter-batch timeout so the caller can cancel it on stop()
  onScheduled: (timeout: ReturnType<typeof setTimeout>) => void,
  // called once the whole map has been walked (or there was nothing to walk)
  onComplete: () => void,
) {
  const iterator = map.entries()

  function processNextBatch() {
    let processed = 0
    let result = iterator.next()

    // process inline as we pull from the iterator — no intermediate array.
    // deleting from the map during iteration (via unregisterNode) is safe:
    // unvisited deleted entries are skipped, newly added nodes get visited.
    while (!result.done && processed < batchSize) {
      const node = result.value[1]
      if (node) {
        processBatchCallback(node)
      }
      processed++
      result = iterator.next()
    }

    if (processed > 0) {
      // yield the thread between batches so the browser can run other work
      onScheduled(setTimeout(processNextBatch, 50))
    } else {
      onComplete()
    }
  }

  processNextBatch()
}

function isNodeStillActive(node: Node): [isCon: boolean, reason: string] {
  try {
    if (!node.isConnected) {
      return [false, 'not connected']
    }
    const nodeIsDocument = node.nodeType === Node.DOCUMENT_NODE
    const nodeWindow = nodeIsDocument
      ? (node as Document).defaultView
      : node.ownerDocument?.defaultView

    const ownerDoc = nodeIsDocument ? (node as Document) : node.ownerDocument
    if (!nodeWindow) {
      return [false, 'no window']
    }

    if (nodeWindow.closed) {
      return [false, 'window closed']
    }

    if (!ownerDoc?.documentElement.isConnected) {
      return [false, 'documentElement not connected']
    }

    return [true, 'ok']
  } catch (e) {
    return [false, e]
  }
}

export interface MaintainerOptions {
  /**
   * Run cleanup each X ms
   *
   * @default 30 * 1000
   * */
  interval: number
  /**
   * Maintainer checks nodes in small batches over 50ms timeouts
   *
   * @default 2500
   * */
  batchSize: number
  /**
   * @default true
   * */
  enabled: boolean
}

const defaults = {
  interval: SECOND * 30,
  batchSize: 2500,
  enabled: true,
}

class Maintainer {
  private interval: ReturnType<typeof setInterval>
  private batchTimeout: ReturnType<typeof setTimeout> | undefined
  private isScanning = false
  private readonly options: MaintainerOptions
  constructor(
    private readonly nodes: Map<number, Node | void>,
    private readonly unregisterNode: (node: Node) => void,
    options?: Partial<MaintainerOptions>,
  ) {
    this.options = { ...defaults, ...options }
  }

  public start = () => {
    if (!this.options.enabled) {
      return
    }

    this.stop()

    this.interval = setInterval(() => {
      // a previous scan may still be walking the map across batch timeouts
      // (large DOM and/or background-tab timer throttling). don't pile up.
      if (this.isScanning) {
        return
      }
      this.isScanning = true
      processMapInBatches(
        this.nodes,
        this.options.batchSize,
        (node) => {
          const isActive = isNodeStillActive(node)[0]
          if (!isActive) {
            this.unregisterNode(node)
          }
        },
        (timeout) => {
          this.batchTimeout = timeout
        },
        () => {
          this.batchTimeout = undefined
          this.isScanning = false
        },
      )
    }, this.options.interval)
  }

  public stop = () => {
    if (this.interval) {
      clearInterval(this.interval)
    }
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = undefined
    }
    this.isScanning = false
  }
}

export default Maintainer
