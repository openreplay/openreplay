// @ts-nocheck
import { describe, expect, test, jest, afterEach } from '@jest/globals'
import axiosSpy from '../main/modules/axiosSpy.js'
import selection from '../main/modules/selection.js'
import setupImg from '../main/modules/img.js'
import { Type } from '../main/app/messages.gen.js'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('axiosSpy headers', () => {
  function capture(privateMode: boolean) {
    const sanitize = jest.fn((x) => x)
    let onResponse
    const app = {
      debug: { log() {} },
      sanitizer: { privateMode },
      send: jest.fn(),
      getSessionToken: () => '',
      attachStopCallback() {},
    }
    const instance = {
      interceptors: {
        request: { use: jest.fn(() => 1) },
        response: { use: jest.fn((ok) => ((onResponse = ok), 2)) },
      },
    }
    axiosSpy(
      app,
      instance,
      { ignoreHeaders: ['cookie', 'set-cookie', 'authorization'], failuresOnly: false },
      sanitize,
      JSON.stringify,
    )
    onResponse({
      config: {
        headers: { toJSON: () => ({ Authorization: 'Bearer secret', 'X-Foo': 'y' }) },
        method: 'get',
        url: '/a',
        __openreplay_timing: 0,
      },
      headers: { toJSON: () => ({ 'Set-Cookie': 'a=b', 'content-type': 'application/json' }) },
      status: 200,
      data: {},
    })
    return sanitize.mock.calls[0][0]
  }

  test('ignored headers are dropped from AxiosHeaders (toJSON), case-insensitively', () => {
    const info = capture(false)
    expect(info.request.headers).toEqual({ 'X-Foo': 'y' })
    expect(info.response.headers).toEqual({ 'content-type': 'application/json' })
  })

  test('privateMode drops all headers', () => {
    const info = capture(true)
    expect(info.request.headers).toEqual({})
    expect(info.response.headers).toEqual({})
  })
})

describe('selection', () => {
  function setup(obscuredIds: number[] = []) {
    const ids = new Map<Node, number>()
    let handler
    const app = {
      attachEventListener: (_t, _e, cb) => (handler = cb),
      nodes: { getID: (n: Node) => ids.get(n) },
      sanitizer: { privateMode: false, isObscured: (id: number) => obscuredIds.includes(id) },
      send: jest.fn(),
    }
    selection(app)
    let next = 1
    const track = (el: Element) => {
      ids.set(el.firstChild!, next++)
    }
    const select = (from: Element, to: Element) => {
      const range = document.createRange()
      range.setStart(from.firstChild!, 0)
      range.setEnd(to.firstChild!, (to.firstChild as Text).length)
      const sel = document.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      handler()
      const calls = app.send.mock.calls.filter((c) => c[0][0] === Type.SelectionChange)
      return calls[calls.length - 1][0][3]
    }
    return { track, select }
  }

  test('plain text is sent as is', () => {
    document.body.innerHTML = '<p id="a">public text</p>'
    const { track, select } = setup()
    const a = document.getElementById('a')!
    track(a)
    expect(select(a, a)).toBe('public text')
  })

  test('text is masked when an end is obscured', () => {
    document.body.innerHTML = '<p id="a">public</p><p id="b">secret</p>'
    const { track, select } = setup([2])
    const a = document.getElementById('a')!
    const b = document.getElementById('b')!
    track(a)
    track(b)
    expect(select(a, b)).not.toContain('secret')
  })

  test('text is masked when masked content lies between plain ends', () => {
    document.body.innerHTML =
      '<p id="a">one</p><p data-openreplay-obscured>secret</p><p id="c">two</p>'
    const { track, select } = setup()
    const a = document.getElementById('a')!
    const c = document.getElementById('c')!
    track(a)
    track(c)
    expect(select(a, c)).not.toContain('secret')
  })
})

describe('img', () => {
  function setup(obscuredIds: number[] = []) {
    const ids = new Map<Node, number>()
    let nodeCb
    const app = {
      safe: (f) => f,
      send: jest.fn(),
      attributeSender: { sendSetAttribute: jest.fn() },
      getBaseHref: () => 'http://localhost/shop/item',
      timestamp: () => 0,
      options: { forceNgOff: true },
      attachStopCallback() {},
      attachResanitizeCallback() {},
      sanitizer: { isHidden: () => false, isObscured: (id: number) => obscuredIds.includes(id) },
      nodes: {
        getID: (n: Node) => ids.get(n),
        attachNodeCallback: (cb) => (nodeCb = cb),
        attachNodeListener() {},
      },
    }
    setupImg(app)
    let next = 1
    const add = () => {
      const img = document.createElement('img')
      document.body.append(img)
      ids.set(img, next++)
      nodeCb(img)
      return img
    }
    return { app, add }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))

  test('relative srcset candidates resolve against the base url', async () => {
    const { app, add } = setup()
    const img = add()
    img.setAttribute('srcset', 'a@2x.png 2x, /b.png 3x')
    await flush()
    expect(app.attributeSender.sendSetAttribute).toHaveBeenCalledWith(
      1,
      'srcset',
      'http://localhost/shop/a@2x.png 2x, http://localhost/b.png 3x',
    )
  })

  test('src changes of a masked image are not sent', async () => {
    const { app, add } = setup([1])
    const img = add()
    img.setAttribute('src', 'http://localhost/private.png')
    await flush()
    const srcSends = app.send.mock.calls.filter(
      (c) => c[0][0] === Type.SetNodeAttributeURLBased && c[0][2] === 'src',
    )
    expect(srcSends).toEqual([])
  })
})
