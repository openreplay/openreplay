import type App from '../app/index.js'
import {
  CSSInsertRuleURLBased,
  CSSDeleteRule,
  TechnicalInfo,
  ReplaceVCSS,
} from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'

export default function (app: App | null) {
  if (app === null) {
    return
  }
  if (!window.CSSStyleSheet) {
    app.send(TechnicalInfo('no_stylesheet_prototype_in_window', ''))
    return
  }

  const processOperation = app.safe((stylesheet: CSSStyleSheet, index: number, rule?: string) => {
    const sendMessage =
      typeof rule === 'string'
        ? (nodeID: number) =>
            app.send(CSSInsertRuleURLBased(nodeID, rule, index, app.getBaseHref()))
        : (nodeID: number) => app.send(CSSDeleteRule(nodeID, index))
    // TODO: Extend messages to maintain nested rules (CSSGroupingRule prototype, as well as CSSKeyframesRule)
    if (!stylesheet.ownerNode) {
      throw new Error('Owner Node not found')
    }
    const nodeID = app.nodes.getID(stylesheet.ownerNode)
    if (nodeID !== undefined) {
      sendMessage(nodeID)
    } // else error?
  })

  const replaceVirtualCss = app.safe((ctx: CSSGroupingRule) => {
    let uppermostRuleset = ctx.parentRule
    while (uppermostRuleset?.parentRule) {
      uppermostRuleset = uppermostRuleset.parentRule
    }
    if (uppermostRuleset?.parentStyleSheet?.ownerNode) {
      const entireStyle = uppermostRuleset.cssText
      const parentNodeID = app.nodes.getID(uppermostRuleset.parentStyleSheet.ownerNode)
      const ruleList = uppermostRuleset.parentStyleSheet.cssRules
      let id = -1
      for (let i = 0; i < ruleList.length; i++) {
        const rule = ruleList.item(i)
        if (rule === uppermostRuleset) {
          id = i
          break
        }
      }
      if (parentNodeID && id >= 0) {
        app.send(ReplaceVCSS(parentNodeID, entireStyle, id.toString(), app.getBaseHref()))
      }
    } else {
      app.debug.error('Owner Node not found')
    }
  })

  const patchContext = (context: typeof globalThis) => {
    const { insertRule, deleteRule } = context.CSSStyleSheet.prototype
    const { insertRule: groupInsertRule, deleteRule: groupDeleteRule } =
      context.CSSGroupingRule.prototype

    context.CSSStyleSheet.prototype.insertRule = function (rule: string, index = 0) {
      processOperation(this, index, rule)
      return insertRule.call(this, rule, index) as number
    }
    context.CSSStyleSheet.prototype.deleteRule = function (index: number) {
      processOperation(this, index)
      return deleteRule.call(this, index) as number
    }

    context.CSSGroupingRule.prototype.insertRule = function (rule: string, index = 0) {
      const result = groupInsertRule.call(this, rule, index) as number

      replaceVirtualCss(this)

      return result
    }
    context.CSSGroupingRule.prototype.deleteRule = function (index = 0) {
      const result = groupDeleteRule.call(this, index) as number

      replaceVirtualCss(this)

      return result
    }
  }

  sheet.patchContext(window)
  app.observer.attachContextCallback(patchContext)

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, 'STYLE') || !node.sheet) {
      return
    }
    if (node.textContent !== null && node.textContent.trim().length > 0) {
      return // Only fully virtual sheets maintained so far
    }
    const rules = node.sheet.cssRules
    for (let i = 0; i < rules.length; i++) {
      processOperation(node.sheet, i, rules[i].cssText)
    }
  })
}
