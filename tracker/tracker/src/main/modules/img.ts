import type App from '../app/index.js'
import { isURL, IS_FIREFOX, MAX_STR_LEN, createMutationObserver } from '../utils.js'
import { ResourceTiming, SetNodeAttributeURLBased } from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'

function resolveURL(url: string, location: Location = document.location) {
  url = url.trim()
  if (
    url.startsWith('//') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') // any other possible value here? https://bugzilla.mozilla.org/show_bug.cgi?id=1758035
  ) {
    return url
  } else if (url.startsWith('/')) {
    return location.origin + url
  } else {
    return location.origin + location.pathname + url
  }
}

// https://bugzilla.mozilla.org/show_bug.cgi?id=1607081
function isSVGInFireFox(url: string) {
  return IS_FIREFOX && (url.startsWith('data:image/svg+xml') || url.match(/.svg$|/i))
}

const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

export default function (app: App): void {
  function sendPlaceholder(id: number, node: HTMLImageElement): void {
    app.attributeSender.sendSetAttribute(id, 'src', PLACEHOLDER_SRC)
    const { width, height } = node.getBoundingClientRect()
    if (!node.hasAttribute('width')) {
      app.attributeSender.sendSetAttribute(id, 'width', String(width))
    }
    if (!node.hasAttribute('height')) {
      app.attributeSender.sendSetAttribute(id, 'height', String(height))
    }
  }

  const sendSrcset = function (id: number, img: HTMLImageElement): void {
    const { srcset } = img
    if (!srcset) {
      return
    }
    const resolvedSrcset = srcset
      .split(srcset.match(/,\s+/) ? /,\s+/ : ',')
      .map((str) => resolveURL(str))
      .join(', ')
    app.attributeSender.sendSetAttribute(id, 'srcset', resolvedSrcset)
  }

  const sendSrc = function (id: number, img: HTMLImageElement): void {
    if (img.src.length > MAX_STR_LEN) {
      sendPlaceholder(id, img)
    }
    app.send(SetNodeAttributeURLBased(id, 'src', img.src, app.getBaseHref()))
  }

  const sendImgError = app.safe(function (img: HTMLImageElement): void {
    const resolvedSrc = resolveURL(img.src || '') // Src type is null sometimes. - is it true?
    if (isURL(resolvedSrc)) {
      app.send(ResourceTiming(app.timestamp(), 0, 0, 0, 0, 0, resolvedSrc, 'img', 0, false))
    }
  })

  const sendImgAttrs = app.safe(function (img: HTMLImageElement): void {
    const id = app.nodes.getID(img)
    if (id === undefined) {
      return
    }
    if (!img.complete) {
      return
    }
    if (img.naturalHeight === 0 && img.naturalWidth === 0 && !isSVGInFireFox(img.src)) {
      sendImgError(img)
    } else if (app.sanitizer.isHidden(id) || app.sanitizer.isObscured(id)) {
      sendPlaceholder(id, img)
    } else {
      sendSrc(id, img)
      sendSrcset(id, img)
    }
  })
  const observer = createMutationObserver(
    app.safe((mutations) => {
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
    }) as MutationCallback,
    app.options.forceNgOff,
  )

  app.attachStopCallback(() => {
    observer.disconnect()
  })

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, 'img')) {
      return
    }
    app.nodes.attachNodeListener(node, 'error', () => sendImgError(node))
    app.nodes.attachNodeListener(node, 'load', () => sendImgAttrs(node))
    sendImgAttrs(node)
    observer.observe(node, { attributes: true, attributeFilter: ['src', 'srcset'] })
  })
}
