import {
  RemoveNodeAttribute,
  SetNodeAttribute,
  SetNodeAttributeURLBased,
  SetCSSDataURLBased,
  SetNodeData,
  CreateTextNode,
  CreateElementNode,
  MoveNode,
  RemoveNode,
} from '../messages.gen.js'
import App from '../index.js'
import { isRootNode, isTextNode, isElementNode, isSVGElement, hasTag } from '../guards.js'

function isIgnored(node: Node): boolean {
  if (isTextNode(node)) {
    return false
  }
  if (!isElementNode(node)) {
    return true
  }
  const tag = node.tagName.toUpperCase()
  if (tag === 'LINK') {
    const rel = node.getAttribute('rel')
    const as = node.getAttribute('as')
    return !(rel?.includes('stylesheet') || as === 'style' || as === 'font')
  }
  return (
    tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'META' || tag === 'TITLE' || tag === 'BASE'
  )
}

function isObservable(node: Node): boolean {
  if (isRootNode(node)) {
    return true
  }
  return !isIgnored(node)
}

/*
  TODO:
    - fix unbinding logic + send all removals first (ensure sequence is correct)
    - use document as a 0-node in the upper context (should be updated in player at first)
*/

enum RecentsType {
  New,
  Removed,
  Changed,
}

export default abstract class Observer {
  private readonly observer: MutationObserver
  private readonly commited: Array<boolean | undefined> = []
  private readonly recents: Map<number, RecentsType> = new Map()
  private readonly indexes: Array<number> = []
  private readonly attributesMap: Map<number, Set<string>> = new Map()
  private readonly textSet: Set<number> = new Set()
  constructor(protected readonly app: App, protected readonly isTopContext = false) {
    this.observer = new MutationObserver(
      this.app.safe((mutations) => {
        for (const mutation of mutations) {
          // mutations order is sequential
          const target = mutation.target
          const type = mutation.type

          if (!isObservable(target)) {
            continue
          }
          if (type === 'childList') {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
              // Should be the same as bindTree(mutation.removedNodes[i]), but logic needs to be be untied
              if (isObservable(mutation.removedNodes[i])) {
                this.bindNode(mutation.removedNodes[i])
              }
            }
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              this.bindTree(mutation.addedNodes[i])
            }
            continue
          }
          const id = this.app.nodes.getID(target)
          if (id === undefined) {
            continue
          }
          if (!this.recents.has(id)) {
            this.recents.set(id, RecentsType.Changed) // TODO only when altered
          }
          if (type === 'attributes') {
            const name = mutation.attributeName
            if (name === null) {
              continue
            }
            let attr = this.attributesMap.get(id)
            if (attr === undefined) {
              this.attributesMap.set(id, (attr = new Set()))
            }
            attr.add(name)
            continue
          }
          if (type === 'characterData') {
            this.textSet.add(id)
            continue
          }
        }
        this.commitNodes()
      }),
    )
  }
  private clear(): void {
    this.commited.length = 0
    this.recents.clear()
    this.indexes.length = 1
    this.attributesMap.clear()
    this.textSet.clear()
  }

  private sendNodeAttribute(id: number, node: Element, name: string, value: string | null): void {
    if (isSVGElement(node)) {
      if (name.substr(0, 6) === 'xlink:') {
        name = name.substr(6)
      }
      if (value === null) {
        this.app.send(RemoveNodeAttribute(id, name))
      } else if (name === 'href') {
        if (value.length > 1e5) {
          value = ''
        }
        this.app.send(SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()))
      } else {
        this.app.send(SetNodeAttribute(id, name, value))
      }
      return
    }
    if (
      name === 'src' ||
      name === 'srcset' ||
      name === 'integrity' ||
      name === 'crossorigin' ||
      name === 'autocomplete' ||
      name.substr(0, 2) === 'on'
    ) {
      return
    }
    if (
      name === 'value' &&
      hasTag(node, 'INPUT') &&
      node.type !== 'button' &&
      node.type !== 'reset' &&
      node.type !== 'submit'
    ) {
      return
    }
    if (value === null) {
      this.app.send(RemoveNodeAttribute(id, name))
      return
    }
    if (name === 'style' || (name === 'href' && hasTag(node, 'LINK'))) {
      this.app.send(SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()))
      return
    }
    if (name === 'href' || value.length > 1e5) {
      value = ''
    }
    this.app.send(SetNodeAttribute(id, name, value))
  }

  private sendNodeData(id: number, parentElement: Element, data: string): void {
    if (hasTag(parentElement, 'STYLE') || hasTag(parentElement, 'style')) {
      this.app.send(SetCSSDataURLBased(id, data, this.app.getBaseHref()))
      return
    }
    data = this.app.sanitizer.sanitize(id, data)
    this.app.send(SetNodeData(id, data))
  }

  private bindNode(node: Node): void {
    const [id, isNew] = this.app.nodes.registerNode(node)
    if (isNew) {
      this.recents.set(id, RecentsType.New)
    } else if (this.recents.get(id) !== RecentsType.New) {
      this.recents.set(id, RecentsType.Removed)
    }
  }

  private bindTree(node: Node): void {
    if (!isObservable(node)) {
      return
    }
    this.bindNode(node)
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          isIgnored(node) || this.app.nodes.getID(node) !== undefined
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
      // @ts-ignore
      false,
    )
    while (walker.nextNode()) {
      this.bindNode(walker.currentNode)
    }
  }

  private unbindTree(node: Node) {
    const id = this.app.nodes.unregisterNode(node)
    if (id !== undefined && this.recents.get(id) === RecentsType.Removed) {
      // Sending RemoveNode only for parent to maintain
      this.app.send(RemoveNode(id))

      // Unregistering all the children in order to clear the memory
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) =>
            isIgnored(node) || this.app.nodes.getID(node) === undefined
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT,
        },
        // @ts-ignore
        false,
      )
      while (walker.nextNode()) {
        this.app.nodes.unregisterNode(walker.currentNode)
      }
      // MBTODO: count and send RemovedNodesCount (for the page crash detection in heuristics)
    }
  }

  // A top-consumption function on the infinite lists test. (~1% of performance resources)
  private _commitNode(id: number, node: Node): boolean {
    if (isRootNode(node)) {
      return true
    }
    const parent = node.parentNode
    let parentID: number | undefined

    // Disable parent check for the upper context HTMLHtmlElement, because it is root there... (before)
    // TODO: get rid of "special" cases (there is an issue with CreateDocument altered behaviour though)
    // TODO: Clean the logic (though now it workd fine)
    if (!hasTag(node, 'HTML') || !this.isTopContext) {
      if (parent === null) {
        // Sometimes one observation contains attribute mutations for the removimg node, which gets ignored here.
        // That shouldn't affect the visual rendering ( should it? maybe when transition applied? )
        this.unbindTree(node)
        return false
      }
      parentID = this.app.nodes.getID(parent)
      if (parentID === undefined) {
        this.unbindTree(node)
        return false
      }
      if (!this.commitNode(parentID)) {
        this.unbindTree(node)
        return false
      }
      this.app.sanitizer.handleNode(id, parentID, node)
      if (this.app.sanitizer.isHidden(parentID)) {
        return false
      }
    }
    // From here parentID === undefined if node is top context HTML node
    let sibling = node.previousSibling
    while (sibling !== null) {
      const siblingID = this.app.nodes.getID(sibling)
      if (siblingID !== undefined) {
        this.commitNode(siblingID)
        this.indexes[id] = this.indexes[siblingID] + 1
        break
      }
      sibling = sibling.previousSibling
    }
    if (sibling === null) {
      this.indexes[id] = 0
    }
    const recentsType = this.recents.get(id)
    const isNew = recentsType === RecentsType.New
    const index = this.indexes[id]
    if (index === undefined) {
      throw 'commitNode: missing node index'
    }
    if (isNew) {
      if (isElementNode(node)) {
        let el: Element = node
        if (parentID !== undefined) {
          if (this.app.sanitizer.isHidden(id)) {
            const width = el.clientWidth
            const height = el.clientHeight
            el = node.cloneNode() as Element
            // TODO: use ResizeObserver
            ;(el as HTMLElement | SVGElement).style.width = `${width}px`
            ;(el as HTMLElement | SVGElement).style.height = `${height}px`
          }

          this.app.send(CreateElementNode(id, parentID, index, el.tagName, isSVGElement(node)))
        }
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i]
          this.sendNodeAttribute(id, el, attr.nodeName, attr.value)
        }
      } else if (isTextNode(node)) {
        // for text node id != 0, hence parentID !== undefined and parent is Element
        this.app.send(CreateTextNode(id, parentID as number, index))
        this.sendNodeData(id, parent as Element, node.data)
      }
      return true
    }
    if (recentsType === RecentsType.Removed && parentID !== undefined) {
      this.app.send(MoveNode(id, parentID, index))
    }
    const attr = this.attributesMap.get(id)
    if (attr !== undefined) {
      if (!isElementNode(node)) {
        throw 'commitNode: node is not an element'
      }
      for (const name of attr) {
        this.sendNodeAttribute(id, node, name, node.getAttribute(name))
      }
    }
    if (this.textSet.has(id)) {
      if (!isTextNode(node)) {
        throw 'commitNode: node is not a text'
      }
      // for text node id != 0, hence parent is Element
      this.sendNodeData(id, parent as Element, node.data)
    }
    return true
  }
  private commitNode(id: number): boolean {
    const node = this.app.nodes.getNode(id)
    if (node === undefined) {
      return false
    }
    const cmt = this.commited[id]
    if (cmt !== undefined) {
      return cmt
    }
    return (this.commited[id] = this._commitNode(id, node))
  }
  private commitNodes(isStart = false): void {
    let node
    this.recents.forEach((type, id) => {
      this.commitNode(id)
      if (type === RecentsType.New && (node = this.app.nodes.getNode(id))) {
        this.app.nodes.callNodeCallbacks(node, isStart)
      }
    })
    this.clear()
  }

  // ISSSUE (nodeToBinde should be the same as node. Look at the comment about 0-node at the beginning of the file.)
  // TODO: use one observer instance for all iframes/shadowRoots (composition instiad of inheritance)
  protected observeRoot(
    node: Node,
    beforeCommit: (id?: number) => unknown,
    nodeToBind: Node = node,
  ) {
    this.observer.observe(node, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false,
    })
    this.bindTree(nodeToBind)
    beforeCommit(this.app.nodes.getID(node))
    this.commitNodes(true)
  }

  disconnect(): void {
    this.observer.disconnect()
    this.clear()
  }
}
