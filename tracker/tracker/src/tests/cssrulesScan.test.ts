// @ts-nocheck
import { describe, expect, test, jest } from '@jest/globals'
import cssrules from '../main/modules/cssrules.js'
import { AdoptedSSDeleteRule, AdoptedSSInsertRuleURLBased } from '../main/app/messages.gen.js'

describe('cssrules scanInMemoryCSS', () => {
  test('re-sends only rules that were inserted empty, at their current index', () => {
    jest.useFakeTimers()
    let nodeCb
    const app = {
      send: jest.fn(),
      safe: (f) => f,
      getBaseHref: () => 'http://x/',
      debug: { log() {} },
      observer: { attachContextCallback() {} },
      nodes: { getID: () => 5, attachNodeCallback: (cb) => (nodeCb = cb) },
      attachStopCallback() {},
    }
    // jsdom has no CSSGroupingRule
    if (!window.CSSGroupingRule) window.CSSGroupingRule = class { insertRule() {} deleteRule() {} }
    cssrules(app, { scanInMemoryCSS: true })
    const style = document.createElement('style')
    document.head.append(style)
    const sheet = style.sheet!
    sheet.insertRule('.a { color: red; }', 0)
    nodeCb(style)
    sheet.insertRule('.b {}', 1)
    const sheetID = app.send.mock.calls.find((c) => c[0][1] !== undefined)[0][1]

    app.send.mockClear()
    jest.advanceTimersByTime(300)
    // nothing changed: the non-empty rule must not be re-sent as "added"
    expect(app.send).not.toHaveBeenCalled()

    sheet.cssRules[1].style.setProperty('color', 'blue')
    sheet.insertRule('.c { top: 0; }', 0)
    app.send.mockClear()
    jest.advanceTimersByTime(200)
    const text = sheet.cssRules[2].cssText
    expect(app.send.mock.calls.map((c) => c[0])).toEqual([
      AdoptedSSDeleteRule(sheetID, 2),
      AdoptedSSInsertRuleURLBased(sheetID, text, 2, 'http://x/'),
    ])
    jest.useRealTimers()
  })
})
