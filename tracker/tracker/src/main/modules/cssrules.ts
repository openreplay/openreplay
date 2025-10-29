import type App from '../app/index.js'
import {
  AdoptedSSInsertRuleURLBased,
  AdoptedSSDeleteRule,
  AdoptedSSAddOwner,
  TechnicalInfo,
} from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'
import { nextID, styleSheetIDMap } from './constructedStyleSheets.js'

export interface CssRulesOptions {
  /** turn this on if you have issues with emotionjs created styles */
  scanInMemoryCSS?: boolean
  /** how often to scan tracked stylesheets (with "empty" rules) */
  checkCssInterval?: number
  /**
  Useful for cases where you expect limited amount of mutations

  i.e when sheets are hydrated on client after initial render.

  if you want to observe for x seconds, do (x*1000)/checkCssInterval = checkLimit

  applied to each stylesheet individually.
  */
  checkLimit?: number
}

const defaults: CssRulesOptions = {
  checkCssInterval: 200,
  scanInMemoryCSS: false,
  checkLimit: undefined,
}

export default function (app: App, opts: CssRulesOptions) {
  if (app === null) return
  if (!window.CSSStyleSheet) {
    app.send(TechnicalInfo('no_stylesheet_prototype_in_window', ''))
    return
  }
  const options = { ...defaults, ...opts }

  //  sheetID:index -> ruleText
  const ruleSnapshots = new Map<string, string>()
  let checkInterval: number | null = null
  const trackedSheets: Set<CSSStyleSheet> = new Set();
  const checkIntervalMs = options.checkCssInterval || 200
  let checkIterations: Record<number, number> = {}

  function checkRuleChanges() {
    if (!options.scanInMemoryCSS) return
    const allSheets = trackedSheets.values()
    for (const sheet of allSheets) {
      try {
        const sheetID = styleSheetIDMap.get(sheet)
        if (!sheetID) continue
        if (options.checkLimit) {
          if (!checkIterations[sheetID]) {
            checkIterations[sheetID] = 0
          } else {
            checkIterations[sheetID]++
          }
          if (checkIterations[sheetID] > options.checkLimit) {
            trackedSheets.delete(sheet)
            return
          }
        }
        for (let j = 0; j < sheet.cssRules.length; j++) {
          try {
            const rule = sheet.cssRules[j]
            const key = `${sheetID}:${j}`
            const oldText = ruleSnapshots.get(key)
            const newText = rule.cssText

            if (oldText !== newText) {
              if (oldText !== undefined) {
                // Rule is changed
                app.send(AdoptedSSDeleteRule(sheetID, j))
                app.send(AdoptedSSInsertRuleURLBased(sheetID, newText, j, app.getBaseHref()))
              } else {
                // Rule added
                app.send(AdoptedSSInsertRuleURLBased(sheetID, newText, j, app.getBaseHref()))
              }
              ruleSnapshots.set(key, newText)
            }
          } catch (e) {
            /* Skip inaccessible rules */
          }
        }

        const keysToCheck = Array.from(ruleSnapshots.keys()).filter((key) =>
          key.startsWith(`${sheetID}:`),
        )

        for (const key of keysToCheck) {
          const index = parseInt(key.split(':')[1], 10)
          if (index >= sheet.cssRules.length) {
            ruleSnapshots.delete(key)
          }
        }
      } catch (e) {
        /* Skip inaccessible sheets */
        trackedSheets.delete(sheet)
      }
    }
  }

  const emptyRuleReg = /{\s*}/
  function isRuleEmpty(rule: string) {
    return emptyRuleReg.test(rule)
  }

  const sendInsertDeleteRule = app.safe((sheet: CSSStyleSheet, index: number, rule?: string) => {
    const sheetID = styleSheetIDMap.get(sheet)
    if (!sheetID) return

    if (typeof rule === 'string') {
      app.send(AdoptedSSInsertRuleURLBased(sheetID, rule, index, app.getBaseHref()))
      if (isRuleEmpty(rule)) {
        ruleSnapshots.set(`${sheetID}:${index}`, rule)
        trackedSheets.add(sheet)
      }
    } else {
      app.send(AdoptedSSDeleteRule(sheetID, index))
      if (ruleSnapshots.has(`${sheetID}:${index}`)) {
        ruleSnapshots.delete(`${sheetID}:${index}`)
      }
    }
  })

  const sendReplaceGroupingRule = app.safe((rule: CSSGroupingRule) => {
    let topmostRule: CSSRule = rule
    while (topmostRule.parentRule) topmostRule = topmostRule.parentRule

    const sheet = topmostRule.parentStyleSheet
    if (!sheet) return

    const sheetID = styleSheetIDMap.get(sheet)
    if (!sheetID) return

    const cssText = topmostRule.cssText
    const idx = Array.from(sheet.cssRules).indexOf(topmostRule)

    if (idx >= 0) {
      app.send(AdoptedSSInsertRuleURLBased(sheetID, cssText, idx, app.getBaseHref()))
      app.send(AdoptedSSDeleteRule(sheetID, idx + 1))
      if (isRuleEmpty(cssText)) {
        ruleSnapshots.set(`${sheetID}:${idx}`, cssText)
        trackedSheets.add(sheet)
      }
    }
  })

  // Patch prototype methods
  const patchContext = app.safe((context: typeof globalThis) => {
    if ((context as any).__css_tracking_patched__) return
    ;(context as any).__css_tracking_patched__ = true

    const { insertRule, deleteRule } = context.CSSStyleSheet.prototype
    const { insertRule: groupInsertRule, deleteRule: groupDeleteRule } =
      context.CSSGroupingRule.prototype

    context.CSSStyleSheet.prototype.insertRule = function (rule: string, index = 0) {
      const result = insertRule.call(this, rule, index)
      sendInsertDeleteRule(this, result, rule)
      return result
    }

    context.CSSStyleSheet.prototype.deleteRule = function (index: number) {
      sendInsertDeleteRule(this, index)
      return deleteRule.call(this, index)
    }

    context.CSSGroupingRule.prototype.insertRule = function (rule: string, index = 0) {
      const result = groupInsertRule.call(this, rule, index)
      sendReplaceGroupingRule(this)
      return result
    }

    context.CSSGroupingRule.prototype.deleteRule = function (index: number) {
      const result = groupDeleteRule.call(this, index)
      sendReplaceGroupingRule(this)
      return result
    }
  })

  patchContext(window)
  app.observer.attachContextCallback(patchContext)

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, 'style') || !node.sheet) return
    if (node.textContent !== null && node.textContent.trim().length > 0) return

    const nodeID = app.nodes.getID(node)
    if (!nodeID) return

    const sheet = node.sheet
    const sheetID = nextID()
    styleSheetIDMap.set(sheet, sheetID)
    app.send(AdoptedSSAddOwner(sheetID, nodeID))

    for (let i = 0; i < sheet.cssRules.length; i++) {
      try {
        sendInsertDeleteRule(sheet, i, sheet.cssRules[i].cssText)
      } catch (e) {
        // Skip inaccessible rules
      }
    }
  })

  function startChecking() {
    if (checkInterval || !options.scanInMemoryCSS) return
    checkInterval = window.setInterval(checkRuleChanges, checkIntervalMs)
  }

  setTimeout(startChecking, 50)

  app.attachStopCallback(() => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    ruleSnapshots.clear()
  })
}
