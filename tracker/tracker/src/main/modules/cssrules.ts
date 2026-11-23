import ContextPatches from '../app/contextPatches.js'
import { emptyStyleRule, sanitizeStyleRule } from '../app/captureSanitizer.js'
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
  const sendRule = (sheetID: number, value: string, index: number) => {
    const baseHref = app.getBaseHref()
    if (app.isDisposed()) return
    const approved = baseHref === null
      ? emptyStyleRule(value)
      : sanitizeStyleRule(app.captureSanitizer, value, 'rule')
    if (app.isDisposed()) return
    app.send(AdoptedSSInsertRuleURLBased(sheetID, approved, index, baseHref ?? ''))
  }
  const options = { ...defaults, ...opts }

  // rules inserted empty (css-in-js fills them through rule.style later) -> last sent text;
  // keyed by the rule object so inserts/deletes elsewhere in the sheet don't shift it
  let ruleSnapshots = new WeakMap<CSSRule, string>()
  let checkInterval: number | null = null
  const trackedSheets: Set<CSSStyleSheet> = new Set()
  const checkIntervalMs = options.checkCssInterval || 200
  let checkIterations: Record<number, number> = {}
  const restoreContexts = new ContextPatches()

  function checkRuleChanges() {
    if (app.isDisposed() || !options.scanInMemoryCSS) return
    const allSheets = trackedSheets.values()
    for (const sheet of allSheets) {
      try {
        const sheetID = styleSheetIDMap.get(sheet)
        if (!sheetID) continue
        if (options.checkLimit) {
          checkIterations[sheetID] = (checkIterations[sheetID] ?? 0) + 1
          if (checkIterations[sheetID] > options.checkLimit) {
            trackedSheets.delete(sheet)
            // continue, not return: skipping one exhausted sheet must not
            // abandon the remaining tracked sheets in this scan.
            continue
          }
        }
        const rules = sheet.cssRules
        for (let j = 0; j < rules.length; j++) {
          try {
            const rule = rules[j]
            const oldText = ruleSnapshots.get(rule)
            if (oldText === undefined) continue
            const newText = rule.cssText
            if (oldText !== newText) {
              app.send(AdoptedSSDeleteRule(sheetID, j))
              sendRule(sheetID, newText, j)
              if (app.isDisposed()) return
              ruleSnapshots.set(rule, newText)
            }
          } catch (e) {
            /* Skip inaccessible rules */
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
    if (app.isDisposed()) return
    const sheetID = styleSheetIDMap.get(sheet)
    if (!sheetID) return

    if (typeof rule === 'string') {
      sendRule(sheetID, rule, index)
      if (app.isDisposed()) return
      if (isRuleEmpty(rule)) {
        const inserted = sheet.cssRules[index]
        if (inserted) {
          ruleSnapshots.set(inserted, rule)
          trackedSheets.add(sheet)
        }
      }
    } else {
      app.send(AdoptedSSDeleteRule(sheetID, index))
    }
  })

  const sendReplaceGroupingRule = app.safe((rule: CSSGroupingRule) => {
    if (app.isDisposed()) return
    let topmostRule: CSSRule = rule
    while (topmostRule.parentRule) topmostRule = topmostRule.parentRule

    const sheet = topmostRule.parentStyleSheet
    if (!sheet) return

    const sheetID = styleSheetIDMap.get(sheet)
    if (!sheetID) return

    const cssText = topmostRule.cssText
    const idx = Array.from(sheet.cssRules).indexOf(topmostRule)

    if (idx >= 0) {
      sendRule(sheetID, cssText, idx)
      if (app.isDisposed()) return
      app.send(AdoptedSSDeleteRule(sheetID, idx + 1))
      if (isRuleEmpty(cssText)) {
        ruleSnapshots.set(topmostRule, cssText)
        trackedSheets.add(sheet)
      }
    }
  })

  // Patch prototype methods
  const patchContext = app.safe((context: typeof globalThis) => {
    if (app.isDisposed() || restoreContexts.has(context)) return
    const sheet = context.CSSStyleSheet.prototype
    const group = context.CSSGroupingRule?.prototype
    const { insertRule, deleteRule } = sheet
    let restoreGroup = () => {}

    const trackInsert: typeof insertRule = function (this: CSSStyleSheet, rule, index = 0) {
      const result = insertRule.call(this, rule, index)
      sendInsertDeleteRule(this, result, rule)
      return result
    }

    const trackDelete: typeof deleteRule = function (this: CSSStyleSheet, index) {
      deleteRule.call(this, index)
      sendInsertDeleteRule(this, index)
    }

    sheet.insertRule = trackInsert
    sheet.deleteRule = trackDelete
    restoreContexts.set(context, () => {
      if (sheet.insertRule === trackInsert) sheet.insertRule = insertRule
      if (sheet.deleteRule === trackDelete) sheet.deleteRule = deleteRule
      restoreGroup()
    })

    if (!group) return
    const { insertRule: groupInsert, deleteRule: groupDelete } = group
    const trackGroupInsert: typeof groupInsert = function (this: CSSGroupingRule, rule, index = 0) {
      const result = groupInsert.call(this, rule, index)
      sendReplaceGroupingRule(this)
      return result
    }
    const trackGroupDelete: typeof groupDelete = function (this: CSSGroupingRule, index) {
      groupDelete.call(this, index)
      sendReplaceGroupingRule(this)
    }
    group.insertRule = trackGroupInsert
    group.deleteRule = trackGroupDelete
    restoreGroup = () => {
      if (group.insertRule === trackGroupInsert) group.insertRule = groupInsert
      if (group.deleteRule === trackGroupDelete) group.deleteRule = groupDelete
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

    // Accessing cssRules on a cross-origin stylesheet (e.g. injected by a
    // browser extension) throws a SecurityError. Probe it before registering
    // the sheet so an inaccessible sheet is skipped instead of aborting start.
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch (e) {
      // Skip inaccessible (cross-origin) stylesheet
      app.debug.log('Couldnt access stylesheet during initial scan', e)
      return
    }

    const sheetID = nextID()
    styleSheetIDMap.set(sheet, sheetID)
    app.send(AdoptedSSAddOwner(sheetID, nodeID))

    for (let i = 0; i < rules.length; i++) {
      try {
        sendInsertDeleteRule(sheet, i, rules[i].cssText)
        if (app.isDisposed()) return
      } catch (e) {
        // Skip inaccessible rules
        app.debug.log('Couldnt access stylesheet rule during initial scan', e)
      }
    }
  })

  function startChecking() {
    if (app.isDisposed() || checkInterval || !options.scanInMemoryCSS) return
    checkInterval = window.setInterval(checkRuleChanges, checkIntervalMs)
  }

  setTimeout(startChecking, 50)

  app.attachStopCallback(() => {
    if (app.isDisposed()) {
      restoreContexts.clear()
      trackedSheets.clear()
    }
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    ruleSnapshots = new WeakMap()
  })
}
