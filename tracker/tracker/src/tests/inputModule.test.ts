// @ts-nocheck
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import setupInput, { InputMode } from '../main/modules/input.js'
import { Type } from '../main/app/messages.gen.js'

function createApp() {
  const ids = new Map<Node, number>()
  const nodesById = new Map<number, Node>()
  const nodeCallbacks: Array<(n: Node) => void> = []
  const tickers: Array<() => void> = []
  const stopCallbacks: Array<() => void> = []
  const resanitize: Array<(n: Node, id: number) => void> = []
  const app = {
    send: jest.fn(),
    safe: (fn: any) => fn,
    ticker: { attach: jest.fn((cb: () => void) => tickers.push(cb)) },
    attachStopCallback: (cb: () => void) => stopCallbacks.push(cb),
    attachResanitizeCallback: (cb: any) => resanitize.push(cb),
    tagMatcher: { match: jest.fn(() => null) },
    sanitizer: {
      privateMode: false,
      isHidden: jest.fn((_id: number) => false),
      isObscured: jest.fn((_id: number) => false),
    },
    nodes: {
      getID: (n: Node) => ids.get(n),
      getNode: (id: number) => nodesById.get(id),
      attachNodeCallback: (cb: any) => nodeCallbacks.push(cb),
      attachNodeListener: (n: Node, type: string, cb: EventListener) => n.addEventListener(type, cb),
    },
  }
  let nextId = 1
  return {
    app,
    /** registers a node the way Nodes does on DOM observe */
    add(node: Node) {
      const id = nextId++
      ids.set(node, id)
      nodesById.set(id, node)
      nodeCallbacks.forEach((cb) => cb(node))
      return id
    },
    remove(node: Node) {
      nodesById.delete(ids.get(node)!)
    },
    tick: () => tickers.forEach((cb) => cb()),
    stop: () => stopCallbacks.forEach((cb) => cb()),
    resanitize: (n: Node, id: number) => resanitize.forEach((cb) => cb(n, id)),
    sent: (type: number) => app.send.mock.calls.map((c) => c[0]).filter((m) => m[0] === type),
  }
}

function input(type = 'text', value = '') {
  const el = document.createElement('input')
  el.type = type
  el.value = value
  document.body.appendChild(el)
  return el
}

describe('input module', () => {
  let h: ReturnType<typeof createApp>

  beforeEach(() => {
    h = createApp()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const plain = () => setupInput(h.app as any, { defaultInputMode: InputMode.Plain })

  test('sends the initial value of a new text field', () => {
    plain()
    const el = input('text', 'hello')
    const id = h.add(el)
    expect(h.sent(Type.SetInputValue)).toEqual([[Type.SetInputValue, id, 'hello', 0]])
  })

  test('ticker polling catches programmatic value changes, without duplicates', () => {
    plain()
    const el = input('text', 'a')
    const id = h.add(el)
    h.tick()
    expect(h.sent(Type.SetInputValue)).toHaveLength(1)

    el.value = 'ab'
    h.tick()
    h.tick()
    expect(h.sent(Type.SetInputValue)).toEqual([
      [Type.SetInputValue, id, 'a', 0],
      [Type.SetInputValue, id, 'ab', 0],
    ])
  })

  test('ticker polling catches programmatic checked and select changes', () => {
    plain()
    const box = input('checkbox')
    const boxId = h.add(box)
    const select = document.createElement('select')
    select.innerHTML = '<option value="a">A</option><option value="b">B</option>'
    document.body.appendChild(select)
    const selectId = h.add(select)
    expect(h.sent(Type.SetInputChecked)).toEqual([[Type.SetInputChecked, boxId, false]])
    expect(h.sent(Type.SetInputValue)).toEqual([[Type.SetInputValue, selectId, 'a', 0]])

    box.checked = true
    select.value = 'b'
    h.tick()
    expect(h.sent(Type.SetInputChecked)).toEqual([
      [Type.SetInputChecked, boxId, false],
      [Type.SetInputChecked, boxId, true],
    ])
    expect(h.sent(Type.SetInputValue)).toEqual([
      [Type.SetInputValue, selectId, 'a', 0],
      [Type.SetInputValue, selectId, 'b', 0],
    ])
  })

  test('stops polling nodes that are gone', () => {
    plain()
    const el = input('text', 'a')
    h.add(el)
    h.remove(el)
    el.value = 'changed'
    h.tick()
    expect(h.sent(Type.SetInputValue)).toHaveLength(1)
  })

  test('password fields are hidden (mask -1, no value) even in plain mode', () => {
    plain()
    const id = h.add(input('password', 'hunter2'))
    expect(h.sent(Type.SetInputValue)).toEqual([[Type.SetInputValue, id, '', -1]])
  })

  test('sanitizer hidden / obscured levels win over plain mode', () => {
    plain()
    h.app.sanitizer.isHidden.mockImplementation((id) => id === 1)
    h.app.sanitizer.isObscured.mockImplementation((id) => id === 2)
    h.add(input('text', 'secret'))
    h.add(input('text', 'abc'))
    expect(h.sent(Type.SetInputValue)).toEqual([
      [Type.SetInputValue, 1, '', -1],
      [Type.SetInputValue, 2, '', 3],
    ])
  })

  test.each([
    ['4+ digit numbers', 'text', 'card 1234', true],
    ['short numbers', 'text', 'room 123', false],
    ['emails by content', 'text', 'me@x.io', true],
    ['email fields', 'email', 'not an address', true],
  ])('plain mode obscures %s', (_, type, value, obscured) => {
    plain()
    const id = h.add(input(type, value))
    expect(h.sent(Type.SetInputValue)[0]).toEqual(
      obscured ? [Type.SetInputValue, id, '', value.length] : [Type.SetInputValue, id, value, 0],
    )
  })

  test('obscure rules can be turned off; dates are opt-in', () => {
    setupInput(h.app as any, {
      defaultInputMode: InputMode.Plain,
      obscureInputNumbers: false,
      obscureInputEmails: false,
    })
    h.add(input('text', '12345 me@x.io'))
    h.add(input('date', '2024-01-01'))
    expect(h.sent(Type.SetInputValue).map((m) => m[3])).toEqual([0, 0])

    const h2 = createApp()
    setupInput(h2.app as any, { defaultInputMode: InputMode.Plain, obscureInputDates: true })
    h2.add(input('date', '2024-01-01'))
    expect(h2.sent(Type.SetInputValue)[0]).toEqual([Type.SetInputValue, 1, '', 10])
  })

  test('default mode is obscured', () => {
    setupInput(h.app as any, {})
    const id = h.add(input('text', 'hello'))
    expect(h.sent(Type.SetInputValue)).toEqual([[Type.SetInputValue, id, '', 5]])
  })

  test('change event sends InputChange with label and masked flag', () => {
    plain()
    const el = input('text', 'hello')
    el.name = 'first-name'
    const id = h.add(el)
    el.dispatchEvent(new Event('change'))
    expect(h.sent(Type.InputChange)).toEqual([
      [Type.InputChange, id, 'hello', false, 'first-name', 0, 0],
    ])

    el.value = 'me@x.io'
    el.dispatchEvent(new Event('change'))
    expect(h.sent(Type.InputChange)[1]).toEqual([Type.InputChange, id, '', true, 'first-name', 0, 0])
  })

  test('InputChange label comes from a matching tag and is wiped in private mode', () => {
    plain()
    h.app.tagMatcher.match.mockReturnValue({ id: 1, selector: '#tagged' })
    const el = input('text', 'x')
    h.add(el)
    el.dispatchEvent(new Event('change'))
    expect(h.sent(Type.InputChange)[0][4]).toBe('#tagged')

    h.app.sanitizer.privateMode = true
    el.dispatchEvent(new Event('change'))
    expect(h.sent(Type.InputChange)[1][4]).toBe('*******')
  })

  test('resanitize callback re-emits the value with the new level', () => {
    plain()
    const el = input('text', 'hello')
    const id = h.add(el)
    h.app.sanitizer.isObscured.mockReturnValue(true)
    h.resanitize(el, id)
    expect(h.sent(Type.SetInputValue)).toEqual([
      [Type.SetInputValue, id, 'hello', 0],
      [Type.SetInputValue, id, '', 5],
    ])

    const div = document.createElement('div')
    h.resanitize(div, 99)
    expect(h.sent(Type.SetInputValue)).toHaveLength(2)
  })

  test('stop drops tracked fields from polling', () => {
    plain()
    const el = input('text', 'a')
    h.add(el)
    h.stop()
    el.value = 'b'
    h.tick()
    // no longer polled after stop
    expect(h.sent(Type.SetInputValue)).toHaveLength(1)
  })
})
