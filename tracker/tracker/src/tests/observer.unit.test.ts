import { describe, expect, test, jest, afterEach } from '@jest/globals'
import { shouldSkipValueAttribute } from '../main/app/observer/observer.js'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

function input(type?: string): HTMLInputElement {
  const el = document.createElement('input')
  if (type !== undefined) el.setAttribute('type', type)
  return el
}

describe('shouldSkipValueAttribute', () => {
  test('keeps value for checkbox/radio (needed by conditional CSS selectors)', () => {
    // Regression: Tailwind `has-[[value=duck]:checked]` / `:has([value=duck]:checked)`
    // rules never match in replay if the value attribute is stripped, hiding the
    // elements they style.
    expect(shouldSkipValueAttribute(input('checkbox'))).toBe(false)
    expect(shouldSkipValueAttribute(input('radio'))).toBe(false)
  })

  test('keeps value for button/reset/submit (label, not user content)', () => {
    expect(shouldSkipValueAttribute(input('button'))).toBe(false)
    expect(shouldSkipValueAttribute(input('reset'))).toBe(false)
    expect(shouldSkipValueAttribute(input('submit'))).toBe(false)
  })

  test('strips value for free-form text inputs (masked via SetInputValue instead)', () => {
    // default type is "text"
    expect(shouldSkipValueAttribute(input())).toBe(true)
    expect(shouldSkipValueAttribute(input('text'))).toBe(true)
    expect(shouldSkipValueAttribute(input('password'))).toBe(true)
    expect(shouldSkipValueAttribute(input('email'))).toBe(true)
    expect(shouldSkipValueAttribute(input('number'))).toBe(true)
    expect(shouldSkipValueAttribute(input('search'))).toBe(true)
  })

  test('does not strip value for non-input elements', () => {
    expect(shouldSkipValueAttribute(document.createElement('option'))).toBe(false)
    expect(shouldSkipValueAttribute(document.createElement('li'))).toBe(false)
    expect(shouldSkipValueAttribute(document.createElement('progress'))).toBe(false)
  })
})

describe('value attribute wiring', () => {
  let observer: TopObserver | undefined

  afterEach(() => {
    observer?.disconnect()
    observer = undefined
  })

  test('only preserved input types send their value attribute', async () => {
    const sent: any[] = []
    const app: any = {
      options: { forceNgOff: true },
      safe: (f: any) => f,
      send: (msg: any) => sent.push(msg),
      getBaseHref: () => 'http://localhost/',
      debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    }
    app.nodes = new Nodes({ node_id: '__openreplay_id', forceNgOff: true, maintainer: { enabled: false } })
    app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: false } })
    app.attributeSender = {
      sendSetAttribute: (id: number, name: string, value: string) =>
        app.send([Type.SetNodeAttribute, id, name, value]),
    }
    document.documentElement.innerHTML =
      '<head></head><body><input type="checkbox" value="duck"><input type="text" value="secret"></body>'
    const [checkbox, text] = Array.from(document.querySelectorAll('input'))

    observer = new TopObserver({ app, options: {} })
    observer.observe()

    const checkboxId = app.nodes.getID(checkbox)
    const textId = app.nodes.getID(text)
    const attrs = (id: number) =>
      sent.filter((m) => m[0] === Type.SetNodeAttribute && m[1] === id).map((m) => [m[2], m[3]])

    expect(attrs(checkboxId)).toEqual([
      ['type', 'checkbox'],
      ['value', 'duck'],
    ])
    expect(attrs(textId)).toEqual([['type', 'text']])

    // runtime attribute changes follow the same rule
    const before = sent.length
    checkbox.setAttribute('value', 'goose')
    text.setAttribute('value', 'other')
    await Promise.resolve()
    const later = sent.slice(before).filter((m) => m[0] === Type.SetNodeAttribute)
    expect(later).toEqual([[Type.SetNodeAttribute, checkboxId, 'value', 'goose']])
  })
})
