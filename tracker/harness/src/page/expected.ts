// Serializes the live DOM the way a correct tracker+player pair should reproduce it.
import Sanitizer, { SanitizeLevel, stringWiper } from '@tracker/main/app/sanitizer.js'

// the oracle keeps its own copy: it must not move with the code under test
function isIgnored(node: Node): boolean {
  if (node.nodeType === 3) return false
  if (node.nodeType !== 1) return true
  const tag = (node as Element).localName
  if (tag === 'link') {
    const rel = (node as Element).getAttribute('rel')
    const as = (node as Element).getAttribute('as')
    return !(rel?.includes('stylesheet') || as === 'style' || as === 'font')
  }
  return tag === 'script' || tag === 'noscript' || tag === 'meta' || tag === 'title' || tag === 'base'
}

const PRESERVE = new Set(['button', 'reset', 'submit', 'checkbox', 'radio'])
const isSVG = (el: Element) =>
  el.namespaceURI === 'http://www.w3.org/2000/svg' || el.localName === 'svg'

function attr(el: Element, name: string, value: string): [string, string] | null {
  if (isSVG(el)) {
    if (name.startsWith('xlink:')) name = name.substring(6)
    if (name === 'href' && value.length > 1e5) value = ''
    return [name, value]
  }
  if (
    name === 'src' ||
    name === 'srcset' ||
    name === 'integrity' ||
    name === 'crossorigin' ||
    name === 'autocomplete' ||
    name.substring(0, 2) === 'on'
  )
    return null
  if (name === 'value' && el.localName === 'input' && !PRESERVE.has((el as HTMLInputElement).type))
    return null
  if (name === 'style' || (name === 'href' && el.localName === 'link')) return [name, value]
  if (name === 'href' || value.length > 1e5) value = ''
  return [name, value]
}

function maskEmails(data: string) {
  return data.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, (email) => {
    const at = email.lastIndexOf('@')
    const stars = (s: string) => '*'.repeat(s.length)
    return `${stars(email.slice(0, at))}@${email.slice(at + 1).split('.').map(stars).join('.')}`
  })
}

const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

function resolveURL(url: string) {
  url = url.trim()
  if (/^(\/\/|https?:\/\/|data:)/.test(url)) return url
  try {
    return new URL(url, document.baseURI).href
  } catch (e) {
    return url
  }
}

const resolveSrcset = (srcset: string) =>
  srcset
    .split(srcset.match(/,\s+/) ? /,\s+/ : ',')
    .map((c) => {
      const [url, ...descriptors] = c.trim().split(/\s+/)
      return [resolveURL(url), ...descriptors].join(' ')
    })
    .join(', ')

// Full tracker only: the img module sends the src/srcset the observer skips.
function imgModuleAttrs(el: Element, lvl: SanitizeLevel, parentLvl: SanitizeLevel, san: Sanitizer) {
  const out: [string, string][] = []
  if (el.localName === 'source') {
    const picture = el.parentElement
    const srcset = (el as HTMLSourceElement).srcset
    if (!picture || picture.localName !== 'picture' || !srcset || lvl >= SanitizeLevel.Obscured) return out
    // <source> follows the masking of its <picture>'s <img>
    const img = Array.from(picture.children).find((c) => c.localName === 'img')
    if (img && san.computeLevel(img, parentLvl) >= SanitizeLevel.Obscured) return out
    out.push(['srcset', resolveSrcset(srcset)])
    return out
  }
  if (el.localName !== 'img') return out
  const img = el as HTMLImageElement
  if (!img.getAttribute('src') && !img.getAttribute('srcset')) return out
  // broken: reported as a failed resource, no src
  if (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0) return out
  if (lvl >= SanitizeLevel.Obscured) {
    const { width, height } = img.getBoundingClientRect()
    out.push(['src', PLACEHOLDER_SRC])
    if (!img.hasAttribute('width')) out.push(['width', String(width)])
    if (!img.hasAttribute('height')) out.push(['height', String(height)])
    return out
  }
  if (img.getAttribute('src')) {
    if (img.src.length > 1e5) {
      const { width, height } = img.getBoundingClientRect()
      out.push(['src', PLACEHOLDER_SRC])
      if (!img.hasAttribute('width')) out.push(['width', String(width)])
      if (!img.hasAttribute('height')) out.push(['height', String(height)])
    } else {
      out.push(['src', img.src])
    }
  }
  if (img.srcset) out.push(['srcset', resolveSrcset(img.srcset)])
  return out
}

export function expectedTree(
  opts: { captureClosed?: boolean; closed?: WeakMap<Element, ShadowRoot>; imgModule?: boolean } = {},
) {
  const san = new Sanitizer({ app: null as any, options: { obscureTextEmails: true } })

  const kids = (parent: Node, lvl: SanitizeLevel): string => {
    let out = ''
    for (let c = parent.firstChild; c !== null; c = c.nextSibling) out += node(c, lvl)
    return out
  }

  const node = (n: Node, parentLvl: SanitizeLevel): string => {
    if (isIgnored(n)) return ''
    const lvl = san.computeLevel(n, parentLvl)
    if (n.nodeType === 3) {
      const p = n.parentNode as Element | null
      const data = (n as Text).data
      if (p && p.localName === 'style') return JSON.stringify(data)
      return JSON.stringify(lvl >= SanitizeLevel.Obscured ? stringWiper(data) : maskEmails(data))
    }
    const el = n as Element
    const hidden = lvl === SanitizeLevel.Hidden
    return element(el, lvl, hidden, false, opts.imgModule ? imgModuleAttrs(el, lvl, parentLvl, san) : [])
  }

  const element = (
    live: Element,
    lvl: SanitizeLevel,
    hidden: boolean,
    topHtml = false,
    extra: [string, string][] = [],
  ): string => {
    let el = live
    if (hidden) {
      const w = el.clientWidth
      const h = el.clientHeight
      el = live.cloneNode() as Element
      ;(el as HTMLElement).style.width = `${w}px`
      ;(el as HTMLElement).style.height = `${h}px`
    }
    const list: [string, string][] = []
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i]
      // placeholder size is sampled when the node is created; don't compare it
      if (hidden && a.nodeName === 'style') continue
      const r = attr(el, a.nodeName, a.value)
      if (r) list.push(r)
    }
    list.push(...extra)
    const attrs = list
      .filter(([k]) => !k.startsWith('__openreplay') && k !== 'orloaded')
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
      .join('')
    let root = ''
    if (!hidden) {
      el = live
      const sr = el.shadowRoot ?? (opts.captureClosed ? opts.closed?.get(el) : null)
      if (sr) root = `{#root${kids(sr, lvl)}}`
      if (el.localName === 'iframe' && !el.hasAttribute('data-openreplay-obscured')) {
        let doc: Document | null = null
        try {
          doc = (el as HTMLIFrameElement).contentDocument
        } catch (e) {}
        if (doc && doc.documentElement) root = `{#root${kids(doc, SanitizeLevel.Plain)}}`
      }
    }
    const inner = hidden ? '' : kids(live, lvl)
    return `<${live.tagName}${attrs}>${root}${inner}</${live.tagName}>`
  }

  const html = document.documentElement
  const lvl = san.computeLevel(html, SanitizeLevel.Plain)
  return element(html, lvl, lvl === SanitizeLevel.Hidden, true)
}
