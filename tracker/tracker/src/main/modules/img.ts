import { PLACEHOLDER_SRC, sanitizeCapture } from '../app/captureSanitizer.js'
import type App from '../app/index.js'
import { isURL, IS_FIREFOX, MAX_STR_LEN, createMutationObserver } from '../utils.js'
import { ResourceTiming } from '../app/messages.gen.js'
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

export default function (app: App): void {
  function sendPlaceholder(id: number, node: HTMLImageElement): void {
    app.attributeSender.removeAttribute(id, 'srcset')
    app.attributeSender.sendSetAttribute(id, 'src', PLACEHOLDER_SRC, { generated: true, resourceType: 'image' })
    const { width, height } = node.getBoundingClientRect()
    if (!node.hasAttribute('width')) {
      app.attributeSender.sendSetAttribute(id, 'width', String(width), { generated: true })
    }
    if (!node.hasAttribute('height')) {
      app.attributeSender.sendSetAttribute(id, 'height', String(height), { generated: true })
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
    app.attributeSender.sendSetAttribute(id, 'srcset', resolvedSrcset, { resourceType: 'image' })
  }

  const sendSrc = function (id: number, img: HTMLImageElement): void {
    if (img.src.length > MAX_STR_LEN) {
      sendPlaceholder(id, img)
      return
    }
    app.attributeSender.sendURLBasedAttribute(id, 'src', img.src)
  }

  const sendImgError = app.safe(function (img: HTMLImageElement): void {
    const id = app.nodes.getID(img)
    if (id === undefined || app.sanitizer.isHidden(id) || app.sanitizer.isObscured(id)) return
    const resolvedSrc = sanitizeCapture(app.captureSanitizer, {
      kind: 'resource',
      resourceType: 'timing',
      value: resolveURL(img.src || ''),
      node: img,
    }) // Src type is null sometimes. - is it true?
    if (resolvedSrc !== null && isURL(resolvedSrc)) {
      app.send(
        ResourceTiming(
          app.timestamp(),
          0,
          0,
          0,
          0,
          0,
          resolvedSrc,
          'img',
          0,
          false,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ),
      )
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
    if (app.sanitizer.isHidden(id) || app.sanitizer.isObscured(id)) {
      sendPlaceholder(id, img)
    } else if (img.naturalHeight === 0 && img.naturalWidth === 0 && !isSVGInFireFox(img.src)) {
      sendImgError(img)
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
            continue
          }
          if (app.sanitizer.isHidden(id) || app.sanitizer.isObscured(id)) {
            sendPlaceholder(id, target)
            continue
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

  // On a runtime level change, re-evaluate placeholder vs real src for this image.
  app.attachResanitizeCallback((node: Node) => {
    if (hasTag(node, 'img')) {
      sendImgAttrs(node)
    }
  })
}
