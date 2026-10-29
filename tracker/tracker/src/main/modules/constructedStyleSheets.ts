import type App from '../app/index.js'
import {
  AdoptedSSReplaceURLBased,
  AdoptedSSInsertRuleURLBased,
  AdoptedSSAddOwner,
  AdoptedSSRemoveOwner,
} from '../app/messages.gen.js'
import { isRootNode } from '../app/guards.js'

type StyleSheetOwner = (Document | ShadowRoot) & { adoptedStyleSheets: CSSStyleSheet[] }

function hasAdoptedSS(node: Node): node is StyleSheetOwner {
  return (
    isRootNode(node) &&
    // @ts-ignore
    !!node.adoptedStyleSheets
  )
}

// TODO: encapsulate to be init-ed on-start and join with cssrules.ts under one folder
let _id = 0xf

export function nextID(): number {
  return _id++
}

// weak: a strong map kept every sheet, and through ownerNode whole detached iframe documents
export let styleSheetIDMap: WeakMap<CSSStyleSheet, number> = new WeakMap()

export default function (app: App | null) {
  if (app === null) {
    return
  }
  if (!hasAdoptedSS(document)) {
    return
  }

  const adoptedStyleSheetsOwnings: Map<number, number[]> = new Map()

  const sendAdoptedStyleSheetsUpdate = (root: StyleSheetOwner) =>
    setTimeout(() => {
      let nodeID = app.nodes.getID(root)
      if (root === document) {
        nodeID = 0 // main document doesn't have nodeID. ID count starts from the documentElement
      }
      if (nodeID === undefined) {
        return
      }
      let pastOwning = adoptedStyleSheetsOwnings.get(nodeID)
      if (!pastOwning) {
        pastOwning = []
      }
      const nowOwning: number[] = []
      const styleSheets = root.adoptedStyleSheets
      if (styleSheets && Symbol.iterator in styleSheets) {
        for (const s of styleSheets) {
          let sheetID = styleSheetIDMap.get(s)
          const init = !sheetID
          if (!sheetID) {
            sheetID = nextID()
            styleSheetIDMap.set(s, sheetID)
          }
          if (!pastOwning.includes(sheetID)) {
            app.send(AdoptedSSAddOwner(sheetID, nodeID))
          }
          if (init) {
            try {
              const rules = s.cssRules
              for (let i = 0; i < rules.length; i++) {
                app.send(
                  AdoptedSSInsertRuleURLBased(sheetID, rules[i].cssText, i, app.getBaseHref()),
                )
              }
            } catch (e) {
              app.debug.log('Couldnt access adopted stylesheet', e)
              // Skip inaccessible (cross-origin) stylesheet
            }
          }
          nowOwning.push(sheetID)
        }
      }
      if (Symbol.iterator in pastOwning) {
        for (const sheetID of pastOwning) {
          if (!nowOwning.includes(sheetID)) {
            app.send(AdoptedSSRemoveOwner(sheetID, nodeID))
          }
        }
      }
      adoptedStyleSheetsOwnings.set(nodeID, nowOwning)
    }, 20) // Mysterious bug:
  /* On the page https://explore.fast.design/components/fast-accordion
    the only rule inside the only adoptedStyleSheet of the iframe-s document
    gets changed during first milliseconds after the load.
    However, none of the documented methods (replace, insertRule) is triggered.
    The rule is not substituted (remains the same object), however the text gets changed.
  */

  // in-place changes (push, splice, index writes) bypass the setter, so the getter hands out
  // a proxy of the live array that reports writes; cached so identity stays stable
  const arrayProxies = new WeakMap<object, { arr: object; proxy: object }>()
  const pendingUpdates = new WeakSet<object>()
  const scheduleUpdate = (root: StyleSheetOwner) => {
    if (pendingUpdates.has(root)) return
    pendingUpdates.add(root)
    setTimeout(() => {
      pendingUpdates.delete(root)
      sendAdoptedStyleSheetsUpdate(root)
    }, 0)
  }

  function patchAdoptedStyleSheets(
    prototype: typeof Document.prototype | typeof ShadowRoot.prototype,
  ) {
    const nativeAdoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      'adoptedStyleSheets',
    )
    if (nativeAdoptedStyleSheetsDescriptor) {
      const nativeGet = nativeAdoptedStyleSheetsDescriptor.get
      Object.defineProperty(prototype, 'adoptedStyleSheets', {
        ...nativeAdoptedStyleSheetsDescriptor,
        get: nativeGet
          ? function (this: StyleSheetOwner) {
              const arr = nativeGet.call(this)
              if (!arr || typeof arr !== 'object') return arr
              const cached = arrayProxies.get(this)
              if (cached && cached.arr === arr) return cached.proxy
              const root = this
              const proxy = new Proxy(arr, {
                set(target, key, value) {
                  const ok = Reflect.set(target, key, value)
                  scheduleUpdate(root)
                  return ok
                },
                deleteProperty(target, key) {
                  const ok = Reflect.deleteProperty(target, key)
                  scheduleUpdate(root)
                  return ok
                },
              })
              arrayProxies.set(this, { arr, proxy })
              return proxy
            }
          : undefined,
        set: function (this: StyleSheetOwner, value) {
          // @ts-ignore
          const retVal = nativeAdoptedStyleSheetsDescriptor.set.call(this, value)
          sendAdoptedStyleSheetsUpdate(this)
          return retVal
        },
      })
    }
  }

  const patchContext = (context: typeof globalThis): void => {
    // @ts-ignore
    if (context.__openreplay_adpss_patched__) {
      return
    } else {
      // @ts-ignore
      context.__openreplay_adpss_patched__ = true
    }
    patchAdoptedStyleSheets(context.Document.prototype)
    patchAdoptedStyleSheets(context.ShadowRoot.prototype)

    //@ts-ignore TODO: upgrade ts to 4.8+
    const { replace, replaceSync } = context.CSSStyleSheet.prototype

    //@ts-ignore
    context.CSSStyleSheet.prototype.replace = function (text: string) {
      return replace.call(this, text).then((sheet: CSSStyleSheet) => {
        const sheetID = styleSheetIDMap.get(this)
        if (sheetID) {
          app.send(AdoptedSSReplaceURLBased(sheetID, text, app.getBaseHref()))
        }
        return sheet
      })
    }
    //@ts-ignore
    context.CSSStyleSheet.prototype.replaceSync = function (text: string) {
      const sheetID = styleSheetIDMap.get(this)
      if (sheetID) {
        app.send(AdoptedSSReplaceURLBased(sheetID, text, app.getBaseHref()))
      }
      return replaceSync.call(this, text)
    }
  }

  patchContext(window)
  app.observer.attachContextCallback(app.safe(patchContext))

  app.attachStopCallback(() => {
    styleSheetIDMap = new WeakMap()
    adoptedStyleSheetsOwnings.clear()
  })

  // So far main Document is not triggered with nodeCallbacks
  app.attachStartCallback(() => {
    sendAdoptedStyleSheetsUpdate(document as StyleSheetOwner)
  })
  app.nodes.attachNodeCallback((node: Node): void => {
    if (hasAdoptedSS(node)) {
      sendAdoptedStyleSheetsUpdate(node)
    }
  })
}
