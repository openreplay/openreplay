// Serializes the live DOM the way a correct tracker+player pair should reproduce it.
import Sanitizer, { SanitizeLevel, stringWiper } from '../../../../tracker/src/main/app/sanitizer.js'
import { isIgnored } from '../next/NextObserver.js'

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

export function expectedTree(opts: { captureClosed?: boolean; closed?: WeakMap<Element, ShadowRoot> } = {}) {
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
    return element(el, lvl, hidden)
  }

  const element = (live: Element, lvl: SanitizeLevel, hidden: boolean, topHtml = false): string => {
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
