import type App from '../app/index.js'
import { timestamp, isURL } from '../utils.js'
import { ResourceTiming, SetNodeAttributeURLBased, SetNodeAttribute } from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'

function resolveURL(url: string, location: Location = document.location) {
  url = url.trim()
  if (url.startsWith('/')) {
    return location.origin + url
  } else if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') // any other possible value here?
  ) {
    return url
  } else {
    return location.origin + location.pathname + url
  }
}

const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

export default function (app: App): void {
  function sendPlaceholder(id: number, node: HTMLImageElement): void {
    app.send(SetNodeAttribute(id, 'src', PLACEHOLDER_SRC))
    const { width, height } = node.getBoundingClientRect()
    if (!node.hasAttribute('width')) {
      app.send(SetNodeAttribute(id, 'width', String(width)))
    }
    if (!node.hasAttribute('height')) {
      app.send(SetNodeAttribute(id, 'height', String(height)))
    }
  }

  const sendSrcset = function (id: number, img: HTMLImageElement): void {
    const { srcset } = img
    if (!srcset) {
      return
    }
    const resolvedSrcset = srcset
      .split(',')
      .map((str) => resolveURL(str))
      .join(',')
    app.send(SetNodeAttribute(id, 'srcset', resolvedSrcset))
  }

  const sendSrc = function (id: number, img: HTMLImageElement): void {
    const src = img.src
    app.send(SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()))
  }

  const sendImgAttrs = app.safe(function (this: HTMLImageElement): void {
    const id = app.nodes.getID(this)
    if (id === undefined) {
      return
    }
    const { src, complete, naturalWidth, naturalHeight } = this
    if (!complete) {
      return
    }
    const resolvedSrc = resolveURL(src || '') // Src type is null sometimes. - is it true?
    if (naturalWidth === 0 && naturalHeight === 0) {
      if (isURL(resolvedSrc)) {
        app.send(ResourceTiming(timestamp(), 0, 0, 0, 0, 0, resolvedSrc, 'img'))
      }
    } else if (resolvedSrc.length >= 1e5 || app.sanitizer.isMasked(id)) {
      sendPlaceholder(id, this)
    } else {
      sendSrc(id, this)
      sendSrcset(id, this)
    }
  })

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLImageElement
        const id = app.nodes.getID(target)
        if (id === undefined) {
          return
        }
        if (mutation.attributeName === 'src') {
          sendSrc(id, target)
        }
        if (mutation.attributeName === 'srcset') {
          sendSrcset(id, target)
        }
      }
    }
  })

  app.attachStopCallback(() => {
    observer.disconnect()
  })

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, 'IMG')) {
      return
    }
    app.nodes.attachNodeListener(node, 'error', sendImgAttrs.bind(node))
    app.nodes.attachNodeListener(node, 'load', sendImgAttrs.bind(node))
    sendImgAttrs.call(node)
    observer.observe(node, { attributes: true, attributeFilter: ['src', 'srcset'] })
  })
}
