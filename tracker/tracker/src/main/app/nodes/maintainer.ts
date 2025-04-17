import VirtualNodeTree from "../observer/vTree"

const SECOND = 1000

function processMapInBatches(
  map: Map<number, Node | void>,
  batchSize: number,
  processBatchCallback: (node: Node, nodeId: number) => void,
) {
  const iterator = map.entries()

  function processNextBatch() {
    const batch: any[] = []
    let result = iterator.next()

    while (!result.done && batch.length < batchSize) {
      batch.push(result.value)
      result = iterator.next()
    }

    if (batch.length > 0) {
      batch.forEach(([nodeId, node]) => {
        if (node) {
          processBatchCallback(node, nodeId)
        }
      })

      setTimeout(processNextBatch, 50)
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
  private readonly options: MaintainerOptions
  private readonly vTree: VirtualNodeTree
  private readonly iframes: Map<number, HTMLIFrameElement>
  constructor(
    private readonly nodes: Map<number, Node | void>,
    private readonly unregisterNode: (node: Node) => void,
    vTree: VirtualNodeTree,
    iframes: Map<number, HTMLIFrameElement>,
    options?: Partial<MaintainerOptions>,
  ) {
    this.options = { ...defaults, ...options }
    this.vTree = vTree
    this.iframes = iframes
  }

  public start = () => {
    if (!this.options.enabled) {
      return
    }

    this.stop()

    this.interval = setInterval(() => {
      processMapInBatches(this.nodes, this.options.batchSize, (node, nodeId) => {
        const isActive = isNodeStillActive(node)[0]
        if (!isActive) {
          this.unregisterNode(node)
          this.iframes.delete(nodeId)
        }
      })
    }, this.options.interval)
  }

  public stop = () => {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}

export default Maintainer
