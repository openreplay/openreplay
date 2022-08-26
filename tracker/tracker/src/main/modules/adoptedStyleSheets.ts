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

  let nextID = 0xf
  const styleSheetIDMap: Map<CSSStyleSheet, number> = new Map()
  const adoptedStyleSheetsOwnings: Map<number, number[]> = new Map()

  const updateAdoptedStyleSheets = (root: StyleSheetOwner) => {
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
        sheetID = ++nextID
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
          updateAdoptedStyleSheets(this)
          return retVal
        },
      })
    }
  }

  const patchContext = (context: typeof globalThis): void => {
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
    context.CSSStyleSheet.prototype.insertRule = function (rule: string, index = 0) {
      const sheetID = styleSheetIDMap.get(this)
      if (sheetID) {
        app.send(AdoptedSSInsertRuleURLBased(sheetID, rule, index, app.getBaseHref()))
      }
      return insertRule.call(this, rule, index)
    }
    context.CSSStyleSheet.prototype.deleteRule = function (index: number) {
      const sheetID = styleSheetIDMap.get(this)
      if (sheetID) {
        app.send(AdoptedSSDeleteRule(sheetID, index))
      }
      return deleteRule.call(this, index)
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
    updateAdoptedStyleSheets(document as StyleSheetOwner)
  })
  app.nodes.attachNodeCallback((node: Node): void => {
    if (hasAdoptedSS(node)) {
      updateAdoptedStyleSheets(node)
    }
  })
}
