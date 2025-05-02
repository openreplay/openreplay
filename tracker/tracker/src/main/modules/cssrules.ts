import type App from '../app/index.js'
import {
  AdoptedSSInsertRuleURLBased,
  AdoptedSSDeleteRule,
  AdoptedSSAddOwner,
  TechnicalInfo,
} from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'
import { nextID, styleSheetIDMap } from './constructedStyleSheets.js'

export default function (app: App, opts: { checkCssInterval?: number }) {
  if (app === null) return
  if (!window.CSSStyleSheet) {
    app.send(TechnicalInfo('no_stylesheet_prototype_in_window', ''))
    return
  }

  // Track CSS rule snapshots by sheetID:index
  const ruleSnapshots = new Map<string, string>()
  let checkInterval: number | null = null
  const checkIntervalMs = opts.checkCssInterval || 200 // Check every 200ms

  // Check all rules for changes
  function checkRuleChanges() {
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i]
        const sheetID = styleSheetIDMap.get(sheet)
        if (!sheetID) continue

        // Check each rule in the sheet
        for (let j = 0; j < sheet.cssRules.length; j++) {
          try {
            const rule = sheet.cssRules[j]
            const key = `${sheetID}:${j}`
            const newText = rule.cssText
            const oldText = ruleSnapshots.get(key)

            if (oldText !== newText) {
              // Rule is new or changed
              if (oldText !== undefined) {
                // Rule changed - send update
                app.send(AdoptedSSDeleteRule(sheetID, j))
                app.send(AdoptedSSInsertRuleURLBased(sheetID, newText, j, app.getBaseHref()))
              } else {
                // Rule added - send insert
                app.send(AdoptedSSInsertRuleURLBased(sheetID, newText, j, app.getBaseHref()))
              }
              ruleSnapshots.set(key, newText)
            }
          } catch (e) {
            /* Skip inaccessible rules */
          }
        }

        // Check for deleted rules
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
      }
    }
  }

  // Standard API hooks
  const sendInsertDeleteRule = app.safe((sheet: CSSStyleSheet, index: number, rule?: string) => {
    const sheetID = styleSheetIDMap.get(sheet)
    if (!sheetID) return

    if (typeof rule === 'string') {
      app.send(AdoptedSSInsertRuleURLBased(sheetID, rule, index, app.getBaseHref()))
      ruleSnapshots.set(`${sheetID}:${index}`, rule)
    } else {
      app.send(AdoptedSSDeleteRule(sheetID, index))
      ruleSnapshots.delete(`${sheetID}:${index}`)
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
      ruleSnapshots.set(`${sheetID}:${idx}`, cssText)
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

  // Apply patches
  patchContext(window)
  app.observer.attachContextCallback(patchContext)

  // Track style nodes
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

  // Start checking and setup cleanup
  function startChecking() {
    if (checkInterval) return
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
