const SECOND = 1000

function processMapInBatches(
  map: Map<number, Node | void>,
  batchSize: number,
  processBatchCallback: (node: Node) => void,
) {
  const iterator = map.entries()

  function processNextBatch() {
    const batch = []
    let result = iterator.next()

    while (!result.done && batch.length < batchSize) {
      batch.push(result.value)
      result = iterator.next()
    }

    if (batch.length > 0) {
      batch.forEach(([_, node]) => {
        if (node) {
          processBatchCallback(node)
        }
      })

      setTimeout(processNextBatch, 50)
    }
  }

  processNextBatch()
}

function isNodeStillActive(node: Node): boolean {
  try {
    if (!node.isConnected) {
      return false
    }

    const nodeWindow = node.ownerDocument?.defaultView

    if (!nodeWindow) {
      return false
    }

    if (nodeWindow.closed) {
      return false
    }

    if (!node.ownerDocument.documentElement.isConnected) {
      return false
    }

    return true
  } catch (e) {
    console.error('Error checking node activity:', e)
    return false
  }
}

class Maintainer {
  private interval: ReturnType<typeof setInterval>
  constructor(
    private readonly nodes: Map<number, Node | void>,
    private readonly unregisterNode: (node: Node) => void,
  ) {}

  public start = () => {
    this.interval = setInterval(() => {
      processMapInBatches(this.nodes, SECOND * 2.5, (node) => {
        if (!isNodeStillActive(node)) {
          this.unregisterNode(node)
        }
      })
    }, SECOND * 30)
  }

  public stop = () => {
    clearInterval(this.interval)
  }
}

export default Maintainer
