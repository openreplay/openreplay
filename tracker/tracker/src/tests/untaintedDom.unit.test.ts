import { describe, expect, test, afterEach, jest } from '@jest/globals'
import {
  initUntaintedDom,
  parentNode,
  previousSibling,
  nextSibling,
  firstChild,
  __resetUntaintedDom,
} from '../main/app/untaintedDom.js'

const ACCESSORS = ['parentNode', 'previousSibling', 'nextSibling', 'firstChild'] as const

describe('untaintedDom', () => {
  const originals = Object.fromEntries(
    ACCESSORS.map((name) => [name, Object.getOwnPropertyDescriptor(Node.prototype, name)!]),
  )

  const patchAll = () => {
    for (const name of ACCESSORS) {
      Object.defineProperty(Node.prototype, name, {
        configurable: true,
        get() {
          return null
        },
      })
    }
  }

  const buildTree = () => {
    const root = document.createElement('div')
    root.innerHTML = '<a></a><b></b>'
    const [a, b] = Array.from(root.children)
    return { root, a, b }
  }

  afterEach(() => {
    for (const name of ACCESSORS) {
      Object.defineProperty(Node.prototype, name, originals[name])
    }
    __resetUntaintedDom()
    jest.restoreAllMocks()
  })

  test('reads plain properties without a helper iframe when prototypes are native', () => {
    const nativeSrc = 'function get() { [native code] }'
    jest.spyOn(Function.prototype, 'toString').mockReturnValue(nativeSrc)
    const createSpy = jest.spyOn(document, 'createElement')

    initUntaintedDom()

    expect(createSpy).not.toHaveBeenCalledWith('iframe')
    createSpy.mockRestore()
    const { root, a, b } = buildTree()
    expect(parentNode(a)).toBe(root)
    expect(firstChild(root)).toBe(a)
    expect(nextSibling(a)).toBe(b)
    expect(previousSibling(b)).toBe(a)
  })

  test('bypasses patched Node.prototype getters via a removed helper iframe', () => {
    const { root, a, b } = buildTree()
    patchAll()
    const createSpy = jest.spyOn(document, 'createElement')

    initUntaintedDom()

    expect(createSpy).toHaveBeenCalledWith('iframe')
    expect(document.querySelectorAll('iframe').length).toBe(0)
    expect(a.parentNode).toBe(null)
    expect(root.firstChild).toBe(null)
    expect(parentNode(a)).toBe(root)
    expect(firstChild(root)).toBe(a)
    expect(nextSibling(a)).toBe(b)
    expect(previousSibling(b)).toBe(a)
    expect(nextSibling(b)).toBe(null)
    expect(previousSibling(a)).toBe(null)
  })

  test('falls back to plain properties when the helper iframe has no contentWindow', () => {
    const { root, a } = buildTree()
    jest.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(null)
    Object.defineProperty(Node.prototype, 'parentNode', {
      configurable: true,
      get() {
        return 'patched'
      },
    })

    initUntaintedDom()

    expect(document.querySelectorAll('iframe').length).toBe(0)
    expect(parentNode(a)).toBe('patched')
    expect(firstChild(root)).toBe(a)
  })
})
