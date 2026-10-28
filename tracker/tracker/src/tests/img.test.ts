import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'
import imgModule from '../main/modules/img'
import Sanitizer from '../main/app/sanitizer'
import { RemoveNodeAttribute, SetNodeAttributeURLBased, Type } from '../main/app/messages.gen.js'

const BASE = 'https://shop.test/product/'
const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

function createApp() {
  const ids = new Map<Node, number>()
  const nodeCallbacks: Array<(node: Node) => void> = []
  const resanitizeCallbacks: Array<(node: Node) => void> = []
  const app: any = {
    send: jest.fn(),
    safe:
      (fn: any) =>
      (...args: any[]) => {
        try {
          return fn(...args)
        } catch {}
      },
    timestamp: () => 0,
    getBaseHref: () => BASE,
    options: { forceNgOff: true },
    attributeSender: { sendSetAttribute: jest.fn() },
    attachStopCallback: jest.fn(),
    attachResanitizeCallback: (cb: any) => resanitizeCallbacks.push(cb),
    nodes: {
      getID: (node: Node) => ids.get(node),
      attachNodeCallback: (cb: any) => nodeCallbacks.push(cb),
      attachNodeListener: (node: Node, type: string, listener: EventListener) =>
        node.addEventListener(type, listener),
    },
  }
  app.sanitizer = new Sanitizer({ app })
  let nextId = 1
  return {
    app,
    // registers + commits like the observer (parent level must be set first)
    commit(node: Node) {
      const id = nextId++
      ids.set(node, id)
      const parentId = node.parentNode ? ids.get(node.parentNode) : undefined
      app.sanitizer.handleNode(id, parentId ?? -1, node)
      return id
    },
    created(node: Node) {
      nodeCallbacks.forEach((cb) => cb(node))
    },
    resanitize(node: Node) {
      const id = ids.get(node)!
      const parentId = node.parentNode ? ids.get(node.parentNode) : undefined
      app.sanitizer.setLevel(
        id,
        app.sanitizer.computeLevel(node, app.sanitizer.getLevel(parentId ?? -1)),
      )
      resanitizeCallbacks.forEach((cb) => cb(node))
    },
  }
}

function stubImg(
  img: HTMLImageElement,
  state: { complete: boolean; naturalWidth?: number; naturalHeight?: number; currentSrc?: string },
) {
  Object.defineProperty(img, 'complete', { configurable: true, get: () => state.complete })
  Object.defineProperty(img, 'naturalWidth', {
    configurable: true,
    get: () => state.naturalWidth ?? 0,
  })
  Object.defineProperty(img, 'naturalHeight', {
    configurable: true,
    get: () => state.naturalHeight ?? 0,
  })
  Object.defineProperty(img, 'currentSrc', {
    configurable: true,
    get: () => state.currentSrc ?? '',
  })
  return img
}

const loaded = { complete: true, naturalWidth: 10, naturalHeight: 10 }
const lazy = { complete: false }

describe('img module', () => {
  let t: ReturnType<typeof createApp>
  let root: HTMLDivElement

  beforeEach(() => {
    t = createApp()
    imgModule(t.app)
    root = document.createElement('div')
    document.body.appendChild(root)
    t.commit(root)
  })

  afterEach(() => {
    root.remove()
  })

  const srcMessages = () =>
    t.app.send.mock.calls
      .map((c: any[]) => c[0])
      .filter((m: any) => m[0] === Type.SetNodeAttributeURLBased)
  const attrCalls = () => t.app.attributeSender.sendSetAttribute.mock.calls
  const resourceErrors = () =>
    t.app.send.mock.calls.map((c: any[]) => c[0]).filter((m: any) => m[0] === Type.ResourceTiming)

  function addImg(
    attrs: Record<string, string>,
    state: Parameters<typeof stubImg>[1],
    parent: Element = root,
  ) {
    const img = document.createElement('img')
    Object.entries(attrs).forEach(([k, v]) => img.setAttribute(k, v))
    stubImg(img, state)
    parent.appendChild(img)
    const id = t.commit(img)
    t.created(img)
    return { img, id }
  }

  test('lazy image that has not loaded still sends src and srcset (#5062)', () => {
    const { id } = addImg(
      {
        src: 'https://cdn.test/photo2.jpg',
        srcset: 'https://cdn.test/photo2.jpg 1000w, https://cdn.test/photo2-300.jpg 300w',
        sizes: 'auto, 92vw',
        loading: 'lazy',
      },
      lazy,
    )
    expect(srcMessages()).toEqual([
      SetNodeAttributeURLBased(id, 'src', 'https://cdn.test/photo2.jpg', BASE),
    ])
    expect(attrCalls()).toEqual([
      [id, 'srcset', 'https://cdn.test/photo2.jpg 1000w, https://cdn.test/photo2-300.jpg 300w'],
    ])
  })

  test('load event does not re-send the src', () => {
    const { img } = addImg({ src: 'https://cdn.test/a.jpg' }, lazy)
    stubImg(img, loaded)
    img.dispatchEvent(new Event('load'))
    expect(srcMessages()).toHaveLength(1)
  })

  test('srcset candidates resolve against the base href and keep descriptors', () => {
    const { id } = addImg({ srcset: 'a.jpg 1x,/b.jpg 2x' }, loaded)
    expect(attrCalls()).toEqual([
      [id, 'srcset', 'https://shop.test/product/a.jpg 1x, https://shop.test/b.jpg 2x'],
    ])
    // no src attribute: nothing to send for it
    expect(srcMessages()).toHaveLength(0)
  })

  test('image already broken at attach reports an error and sends no src', () => {
    addImg(
      { src: 'https://cdn.test/404.jpg' },
      { complete: true, currentSrc: 'https://cdn.test/404.jpg' },
    )
    expect(srcMessages()).toHaveLength(0)
    expect(resourceErrors()).toHaveLength(1)
    expect(resourceErrors()[0][7]).toBe('https://cdn.test/404.jpg')
  })

  test('img without src does not report a failed request for the page URL', () => {
    const { img } = addImg({}, { complete: true })
    const { img: empty } = addImg({ src: '' }, { complete: true })
    img.dispatchEvent(new Event('error'))
    empty.dispatchEvent(new Event('error'))
    expect(t.app.send).not.toHaveBeenCalled()
    expect(attrCalls()).toHaveLength(0)
  })

  test('oversized src sends only the placeholder', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(1e5)
    const { id } = addImg({ src: huge, width: '10', height: '10' }, loaded)
    expect(srcMessages()).toHaveLength(0)
    expect(attrCalls()).toEqual([[id, 'src', PLACEHOLDER_SRC]])
  })

  test('masked image keeps its placeholder when src or srcset changes', async () => {
    const { img, id } = addImg(
      { src: 'https://cdn.test/a.jpg', 'data-openreplay-obscured': '', width: '1', height: '1' },
      lazy,
    )
    expect(attrCalls()).toEqual([[id, 'src', PLACEHOLDER_SRC]])
    img.setAttribute('src', 'https://cdn.test/secret.jpg')
    img.setAttribute('srcset', 'https://cdn.test/secret.jpg 1x')
    await Promise.resolve()
    expect(srcMessages()).toHaveLength(0)
    expect(attrCalls()).toHaveLength(1)
  })

  test('src change on a plain image is sent before it loads', async () => {
    const { img, id } = addImg({ src: 'https://cdn.test/a.jpg' }, loaded)
    img.setAttribute('src', 'https://cdn.test/b.jpg')
    await Promise.resolve()
    expect(srcMessages()).toEqual([
      SetNodeAttributeURLBased(id, 'src', 'https://cdn.test/a.jpg', BASE),
      SetNodeAttributeURLBased(id, 'src', 'https://cdn.test/b.jpg', BASE),
    ])
  })

  test('masking at runtime removes a srcset sent before', () => {
    const { img, id } = addImg(
      {
        src: 'https://cdn.test/a.jpg',
        srcset: 'https://cdn.test/a.jpg 1x',
        width: '1',
        height: '1',
      },
      loaded,
    )
    img.setAttribute('data-openreplay-obscured', '')
    t.resanitize(img)
    expect(attrCalls().at(-1)).toEqual([id, 'src', PLACEHOLDER_SRC])
    expect(t.app.send).toHaveBeenLastCalledWith(RemoveNodeAttribute(id, 'srcset'))
  })

  describe('<picture>', () => {
    function addPicture(imgAttrs: Record<string, string> = {}) {
      const picture = document.createElement('picture')
      root.appendChild(picture)
      t.commit(picture)
      const source = document.createElement('source')
      source.setAttribute('srcset', 'photo.avif 1x, photo@2x.avif 2x')
      source.setAttribute('type', 'image/avif')
      const img = stubImg(document.createElement('img'), lazy)
      img.setAttribute('src', 'https://cdn.test/photo.jpg')
      Object.entries(imgAttrs).forEach(([k, v]) => img.setAttribute(k, v))
      picture.append(source, img)
      // observer order: each node is committed and announced before its next sibling
      const sourceId = t.commit(source)
      t.created(source)
      const imgId = t.commit(img)
      t.created(img)
      return { picture, source, img, sourceId, imgId }
    }

    test('<source> srcset is sent, resolved', () => {
      const { sourceId } = addPicture()
      expect(attrCalls()).toContainEqual([
        sourceId,
        'srcset',
        'https://shop.test/product/photo.avif 1x, https://shop.test/product/photo@2x.avif 2x',
      ])
    })

    test('<source> srcset is not sent when the <img> is masked', () => {
      const { sourceId } = addPicture({ 'data-openreplay-obscured': '', width: '1', height: '1' })
      expect(attrCalls().filter((c: any[]) => c[0] === sourceId)).toHaveLength(0)
    })

    test('<source> srcset is not sent when the <picture> is masked', () => {
      const picture = document.createElement('picture')
      picture.setAttribute('data-openreplay-obscured', '')
      root.appendChild(picture)
      t.commit(picture)
      const source = document.createElement('source')
      source.setAttribute('srcset', 'https://cdn.test/secret.avif')
      picture.appendChild(source)
      t.commit(source)
      t.created(source)
      expect(attrCalls()).toHaveLength(0)
    })

    test('<source> srcset changes are sent unless the <img> is masked', async () => {
      const { source, img, sourceId } = addPicture()
      t.app.attributeSender.sendSetAttribute.mockClear()
      source.setAttribute('srcset', 'https://cdn.test/new.avif')
      await Promise.resolve()
      expect(attrCalls()).toEqual([[sourceId, 'srcset', 'https://cdn.test/new.avif']])

      img.setAttribute('data-openreplay-obscured', '')
      t.resanitize(img)
      expect(t.app.send).toHaveBeenCalledWith(RemoveNodeAttribute(sourceId, 'srcset'))
      t.app.attributeSender.sendSetAttribute.mockClear()
      source.setAttribute('srcset', 'https://cdn.test/secret.avif')
      await Promise.resolve()
      expect(attrCalls()).toHaveLength(0)
    })
  })
})
