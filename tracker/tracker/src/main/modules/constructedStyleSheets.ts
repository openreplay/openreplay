import type App from '../app/index.js'
import {
  TechnicalInfo,
  AdoptedSSReplaceURLBased,
  AdoptedSSInsertRuleURLBased,
  AdoptedSSDeleteRule,
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

// TODO: incapsulate to be init-ed on-start and join with cssrules.ts under one folder
let _id = 0xf
export function nextID(): number {
  return _id++
}
export const styleSheetIDMap: Map<CSSStyleSheet, number> = new Map()

export default function (app: App | null) {
  if (app === null) {
    return
  }
  if (!hasAdoptedSS(document)) {
    app.attachStartCallback(() => {
      // MBTODO: pre-start sendQueue app
      app.send(TechnicalInfo('no_adopted_stylesheets', ''))
    })
    return
  }

  const styleSheetIDMap: Map<CSSStyleSheet, number> = new Map()
  const adoptedStyleSheetsOwnings: Map<number, number[]> = new Map()

  const sendAdoptedStyleSheetsUpdate = (root: StyleSheetOwner) => {
    let nodeID = app.nodes.getID(root)
    if (root === document) {
      nodeID = 0 // main document doesn't have nodeID. ID count starts from the documentElement
    }
    if (!nodeID) {
      return
    }
    let pastOwning = adoptedStyleSheetsOwnings.get(nodeID)
    if (!pastOwning) {
      pastOwning = []
    }
    const nowOwning: number[] = []
    const styleSheets = root.adoptedStyleSheets
    for (const s of styleSheets) {
      let sheetID = styleSheetIDMap.get(s)
      const init = !sheetID
      if (!sheetID) {
        sheetID = nextID()
      }
      nowOwning.push(sheetID)
      if (!pastOwning.includes(sheetID)) {
        app.send(AdoptedSSAddOwner(sheetID, nodeID))
      }
      if (init) {
        const rules = s.cssRules
        for (let i = 0; i < rules.length; i++) {
          app.send(AdoptedSSInsertRuleURLBased(sheetID, rules[i].cssText, i, app.getBaseHref()))
        }
      }
    }
    for (const sheetID of pastOwning) {
      if (!nowOwning.includes(sheetID)) {
        app.send(AdoptedSSRemoveOwner(sheetID, nodeID))
      }
    }
    adoptedStyleSheetsOwnings.set(nodeID, nowOwning)
  }

  function patchAdoptedStyleSheets(
    prototype: typeof Document.prototype | typeof ShadowRoot.prototype,
  ) {
    const nativeAdoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      'adoptedStyleSheets',
    )
    if (nativeAdoptedStyleSheetsDescriptor) {
      Object.defineProperty(prototype, 'adoptedStyleSheets', {
        ...nativeAdoptedStyleSheetsDescriptor,
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

    //@ts-ignore TODO: configure ts (use necessary lib)
    const { insertRule, deleteRule, replace, replaceSync } = context.CSSStyleSheet.prototype

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
  app.observer.attachContextCallback(patchContext)

  app.attachStopCallback(() => {
    styleSheetIDMap.clear()
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
