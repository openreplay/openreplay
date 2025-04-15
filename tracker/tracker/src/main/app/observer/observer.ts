import { createMutationObserver } from '../../utils.js'
import {
  RemoveNodeAttribute,
  SetNodeAttributeURLBased,
  SetCSSDataURLBased,
  SetNodeData,
  CreateTextNode,
  CreateElementNode,
  MoveNode,
  RemoveNode,
  UnbindNodes,
  SetNodeAttribute,
  AdoptedSSInsertRuleURLBased,
  AdoptedSSAddOwner
} from '../messages.gen.js'
import App from '../index.js'
import {
  isRootNode,
  isTextNode,
  isElementNode,
  isSVGElement,
  isUseElement,
  hasTag,
  isCommentNode,
} from '../guards.js'
import { inlineRemoteCss } from './cssInliner.js'
import { nextID } from "../../modules/constructedStyleSheets.js";

const iconCache = {}
const svgUrlCache = {}

async function parseUseEl(
  useElement: SVGUseElement,
  mode: 'inline' | 'dataurl' | 'svgtext',
  domParser: DOMParser,
) {
  try {
    const href = useElement.getAttribute('xlink:href') || useElement.getAttribute('href')
    if (!href) {
      console.debug('Openreplay: xlink:href or href not found on <use>.')
      return
    }

    let [url, symbolId] = href.split('#')

    // happens if svg spritemap is local, fastest case for us
    if (!url && symbolId) {
      const symbol = document.querySelector(href)
      if (symbol) {
        const inlineSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute('viewBox') || '0 0 24 24'}">
          ${symbol.innerHTML}
        </svg>
      `

        iconCache[symbolId] = inlineSvg

        return inlineSvg
      } else {
        console.warn('Openreplay: Sprite symbol not found in the document.')
        return
      }
    }

    if (!url && !symbolId) {
      console.warn('Openreplay: Invalid xlink:href or href found on <use>.')
      return
    }

    if (iconCache[symbolId]) {
      return iconCache[symbolId]
    }

    let svgDoc: Document
    if (svgUrlCache[url]) {
      if (svgUrlCache[url] === 1) {
        await new Promise((resolve) => {
          let tries = 0
          const interval = setInterval(() => {
            if (tries > 100) {
              clearInterval(interval)
              resolve(false)
            }
            if (svgUrlCache[url] !== 1) {
              svgDoc = svgUrlCache[url]
              clearInterval(interval)
              resolve(true)
            } else {
              tries++
            }
          }, 100)
        })
      } else {
        svgDoc = svgUrlCache[url] ?? `<svg xmlns="http://www.w3.org/2000/svg"></svg>`
      }
    } else {
      svgUrlCache[url] = 1
      const response = await fetch(url)
      const svgText = await response.text()
      svgDoc = domParser.parseFromString(svgText, 'image/svg+xml')
      svgUrlCache[url] = svgDoc
    }

    // @ts-ignore
    const symbol = svgDoc.getElementById(symbolId)

    if (!symbol) {
      console.debug('Openreplay: Symbol not found in SVG.')
      return ''
    }

    if (mode === 'inline') {
      const res = { paths: symbol.innerHTML, vbox: symbol.getAttribute('viewBox') || '0 0 24 24' }
      iconCache[symbolId] = res
      return res
    }
    if (mode === 'svgtext') {
      const inlineSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute('viewBox') || '0 0 24 24'}">
          ${symbol.innerHTML}
        </svg>
      `

      iconCache[symbolId] = inlineSvg

      return inlineSvg
    }
    if (mode === 'dataurl') {
      const inlineSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute('viewBox') || '0 0 24 24'}">
          ${symbol.innerHTML}
        </svg>
      `
      const encodedSvg = btoa(inlineSvg)
      const dataUrl = `data:image/svg+xml;base64,${encodedSvg}`

      iconCache[symbolId] = dataUrl

      return dataUrl
    }
    console.debug(`Openreplay: Unknown mode: ${mode}. Use "inline" or "dataurl".`)
  } catch (error) {
    console.error('Openreplay: Error processing <use> element:', error)
  }
}

function isIgnored(node: Node): boolean {
  if (isCommentNode(node)) {
    return true
  }
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
  private readonly disableSprites: boolean = false
  /**
   * this option means that, instead of using link element with href to load css,
   * we will try to parse the css text instead and send it as css rules set
   * can (and will) affect performance
   * */
  private readonly inlineRemoteCss: boolean = false
  private readonly domParser = new DOMParser()
  constructor(
    protected readonly app: App,
    protected readonly isTopContext = false,
    options: { disableSprites: boolean, inlineRemoteCss: boolean } = { disableSprites: false, inlineRemoteCss: false },
  ) {
    this.disableSprites = options.disableSprites
    this.inlineRemoteCss = options.inlineRemoteCss
    this.observer = createMutationObserver(
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
      }) as MutationCallback,
      this.app.options.forceNgOff,
    )
  }
  private clear(): void {
    this.commited.length = 0
    this.recents.clear()
    this.indexes.length = 1
    this.attributesMap.clear()
    this.textSet.clear()
  }

  /**
   * EXPERIMENTAL: Unbinds the removed nodes in case of iframe src change.
   *
   * right now, we're relying on nodes.maintainer
   */
  private handleIframeSrcChange(iframe: HTMLIFrameElement): void {
    const oldContentDocument = iframe.contentDocument
    if (oldContentDocument) {
      const id = this.app.nodes.getID(oldContentDocument)
      if (id !== undefined) {
        const walker = document.createTreeWalker(
          oldContentDocument,
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

        let removed = 0
        const totalBeforeRemove = this.app.nodes.getNodeCount()

        const contentDocument = iframe.contentDocument;
        const nodesUnregister = this.app.nodes.unregisterNode.bind(this.app.nodes);
        while (walker.nextNode()) {
          if (!contentDocument.contains(walker.currentNode)) {
            removed += 1
            nodesUnregister(walker.currentNode)
          }
        }

        const removedPercent = Math.floor((removed / totalBeforeRemove) * 100)
        if (removedPercent > 30) {
          this.app.send(UnbindNodes(removedPercent))
        }
      }
    }
  }

  private sendNodeAttribute(id: number, node: Element, name: string, value: string | null): void {
    if (isSVGElement(node)) {
      if (name.startsWith('xlink:')) {
        name = name.substring(6)
      }
      if (value === null) {
        this.app.send(RemoveNodeAttribute(id, name))
      }

      if (isUseElement(node) && name === 'href' && !this.disableSprites) {
        parseUseEl(node, 'svgtext', this.domParser)
          .then((svgData) => {
            if (svgData) {
              this.app.send(SetNodeAttribute(id, name, `_$OPENREPLAY_SPRITE$_${svgData}`))
            }
          })
          .catch((e: any) => {
            console.error('Openreplay: Error parsing <use> element:', e)
          })
        return
      }

      if (name === 'href') {
        if (value!.length > 1e5) {
          value = ''
        }
        this.app.send(SetNodeAttributeURLBased(id, name, value!, this.app.getBaseHref()))
      } else {
        this.app.attributeSender.sendSetAttribute(id, name, value!)
      }
      return
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
      hasTag(node, 'input') &&
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
    if (name === 'style' || (name === 'href' && hasTag(node, 'link'))) {
      if ('rel' in node && node.rel === 'stylesheet' && this.inlineRemoteCss) {
        setTimeout(() => {
          inlineRemoteCss(
            // @ts-ignore
          node,
          id,
          this.app.getBaseHref(),
          nextID,
            (id: number, cssText: string, index: number, baseHref: string) => {
              this.app.send(AdoptedSSInsertRuleURLBased(id, cssText, index, baseHref))
            },
            (sheetId: number, ownerId: number) => {
              this.app.send(AdoptedSSAddOwner(sheetId, ownerId))
            }
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
    if (['alt', 'placeholder'].includes(name) && this.app.sanitizer.privateMode) {
      value = value.replaceAll(/./g, '*')
    }
    this.app.attributeSender.sendSetAttribute(id, name, value)
  }

  private sendNodeData(id: number, parentElement: Element, data: string): void {
    if (hasTag(parentElement, 'style')) {
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
        acceptNode: (node) => {
          if (this.app.nodes.getID(node) !== undefined) {
            this.app.debug.info('! Node is already bound', node)
          }
          return isIgnored(node) || this.app.nodes.getID(node) !== undefined
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT
        },
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

      let removed = 0
      const totalBeforeRemove = this.app.nodes.getNodeCount()

      while (walker.nextNode()) {
        removed += 1
        this.app.nodes.unregisterNode(walker.currentNode)
      }

      const removedPercent = Math.floor((removed / totalBeforeRemove) * 100)
      if (removedPercent > 30) {
        this.app.send(UnbindNodes(removedPercent))
      }
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
    if (!hasTag(node, 'html') || !this.isTopContext) {
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
          if ('rel' in el && el.rel === 'stylesheet' && this.inlineRemoteCss) {
            this.app.send(CreateElementNode(id, parentID, index, 'STYLE', false))
          } else {
            this.app.send(CreateElementNode(id, parentID, index, el.tagName, isSVGElement(node)))
          }
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
    if (!node) {
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
    for (const [id, type] of this.recents.entries()) {
      this.commitNode(id)
      if (type === RecentsType.New && (node = this.app.nodes.getNode(id))) {
        this.app.nodes.callNodeCallbacks(node, isStart)
      }
    }
    this.clear()
  }

  // ISSSUE (nodeToBinde should be the same as node in all cases. Look at the comment about 0-node at the beginning of the file.)
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
