import type App from '../app/index.js'
import { isURL, IS_FIREFOX, MAX_STR_LEN, createMutationObserver } from '../utils.js'
import {
  RemoveNodeAttribute,
  ResourceTiming,
  SetNodeAttributeURLBased,
} from '../app/messages.gen.js'
import { hasTag } from '../app/guards.js'
import { SanitizeLevel } from '../app/sanitizer.js'

function resolveURL(url: string, base: string = document.baseURI) {
  url = url.trim()
  if (
    url.startsWith('//') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') // any other possible value here? https://bugzilla.mozilla.org/show_bug.cgi?id=1758035
  ) {
    return url
  }
  try {
    return new URL(url, base).href
  } catch (e) {
    return url
  }
}

// srcset candidate: "url [descriptor]"
function resolveSrcsetCandidate(candidate: string, base: string) {
  const [url, ...descriptors] = candidate.trim().split(/\s+/)
  return [resolveURL(url, base), ...descriptors].join(' ')
}

// https://bugzilla.mozilla.org/show_bug.cgi?id=1607081
function isSVGInFireFox(url: string) {
  return IS_FIREFOX && (url.startsWith('data:image/svg+xml') || /\.svg([?#]|$)/i.test(url))
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

  function isMasked(id: number): boolean {
    return app.sanitizer.isHidden(id) || app.sanitizer.isObscured(id)
  }

  const sendSrcset = function (id: number, el: HTMLImageElement | HTMLSourceElement): void {
    const { srcset } = el
    if (!srcset) {
      return
    }
    const resolvedSrcset = srcset
      .split(srcset.match(/,\s+/) ? /,\s+/ : ',')
      .map((str) => resolveSrcsetCandidate(str, app.getBaseHref()))
      .join(', ')
    app.attributeSender.sendSetAttribute(id, 'srcset', resolvedSrcset)
  }

  const sendSrc = function (id: number, img: HTMLImageElement): void {
    if (img.src.length > MAX_STR_LEN) {
      sendPlaceholder(id, img)
      return
    }
    app.send(SetNodeAttributeURLBased(id, 'src', img.src, app.getBaseHref()))
  }

  const sendImgError = app.safe(function (img: HTMLImageElement): void {
    // src="" reads back as the page URL; that is not an image request
    const src = img.currentSrc || (img.getAttribute('src') ? img.src : '')
    const resolvedSrc = resolveURL(src)
    if (src && isURL(resolvedSrc)) {
      app.send(ResourceTiming(app.timestamp(), 0, 0, 0, 0, 0, resolvedSrc, 'img', 0, false, 0, 0, 0, 0, 0, 0, 0))
    }
  })

  // Not waiting for load: lazy images that never load still need src/srcset to lay out in replay.
  const sendImgAttrs = app.safe(function (img: HTMLImageElement, resanitize = false): void {
    const id = app.nodes.getID(img)
    if (id === undefined) {
      return
    }
    if (!img.getAttribute('src') && !img.getAttribute('srcset')) {
      return
    }
    if (
      img.complete &&
      img.naturalHeight === 0 &&
      img.naturalWidth === 0 &&
      !isSVGInFireFox(img.src)
    ) {
      sendImgError(img)
    } else if (isMasked(id)) {
      sendPlaceholder(id, img)
      // a srcset sent before masking would win over the placeholder
      if (resanitize && img.srcset) {
        app.send(RemoveNodeAttribute(id, 'srcset'))
      }
    } else {
      if (img.getAttribute('src')) {
        sendSrc(id, img)
      }
      sendSrcset(id, img)
    }
  })

  // <source> candidates win over the <img> in replay, so they follow its masking.
  // Its own level can't be used: preceding <source>s are committed before the <img>.
  function isPictureMasked(picture: HTMLPictureElement): boolean {
    const pictureId = app.nodes.getID(picture)
    const img = Array.from(picture.children).find((el) => hasTag(el, 'img'))
    return (
      pictureId !== undefined &&
      img !== undefined &&
      app.sanitizer.computeLevel(img, app.sanitizer.getLevel(pictureId)) >= SanitizeLevel.Obscured
    )
  }

  const sendSourceSrcset = app.safe(function (source: HTMLSourceElement, resanitize = false): void {
    const id = app.nodes.getID(source)
    const picture = source.parentElement
    if (id === undefined || !picture || !hasTag(picture, 'picture') || !source.srcset) {
      return
    }
    if (isMasked(id) || isPictureMasked(picture)) {
      if (resanitize) {
        app.send(RemoveNodeAttribute(id, 'srcset'))
      }
    } else {
      sendSrcset(id, source)
    }
  })

  const observer = createMutationObserver(
    app.safe((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLImageElement | HTMLSourceElement
          if (hasTag(target, 'source')) {
            sendSourceSrcset(target)
            continue
          }
          const id = app.nodes.getID(target)
          // masked images keep their placeholder
          if (id === undefined || isMasked(id)) {
            continue
          }
          if (mutation.attributeName === 'src') {
            sendSrc(id, target as HTMLImageElement)
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
    if (hasTag(node, 'source')) {
      sendSourceSrcset(node)
      observer.observe(node, { attributes: true, attributeFilter: ['srcset'] })
      return
    }
    if (!hasTag(node, 'img')) {
      return
    }
    app.nodes.attachNodeListener(node, 'error', () => sendImgError(node))
    sendImgAttrs(node)
    observer.observe(node, { attributes: true, attributeFilter: ['src', 'srcset'] })
  })

  // On a runtime level change, re-evaluate placeholder vs real src for this image
  // and for the <source>s of its <picture>.
  app.attachResanitizeCallback((node: Node) => {
    if (!hasTag(node, 'img')) {
      return
    }
    sendImgAttrs(node, true)
    const picture = node.parentElement
    if (picture && hasTag(picture, 'picture')) {
      for (const child of Array.from(picture.children)) {
        if (hasTag(child, 'source')) {
          sendSourceSrcset(child, true)
        }
      }
    }
  })
}
