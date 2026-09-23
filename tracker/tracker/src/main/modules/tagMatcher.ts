export type Tag = { id: number; selector: string; location?: string }

type IndexedTag = { tag: Tag; order: number }
type Fingerprint = { kind: 'id' | 'data' | 'class'; key: string }

/**
 * Two-tier tag matching:
 * 1. Fingerprint pre-filter by id, data-attr, or class from the selector's last compound
 * 2. Fallback iteration for selectors without a fingerprint
 * Every candidate is confirmed with native element.matches(); tiers keep id > data > class >
 * fallback priority, and within a tier the first tag in list order wins.
 */
class TagMatcher {
  private tags: Tag[] = []
  private byId: Map<string, IndexedTag[]> = new Map()
  private byDataAttr: Map<string, IndexedTag[]> = new Map()
  private byClass: Map<string, IndexedTag[]> = new Map()
  private fallback: IndexedTag[] = []

  setTags(tags: Tag[]) {
    this.clear()
    this.tags = tags

    tags.forEach((tag, order) => {
      const entry = { tag, order }
      const fp = fingerprint(tag.selector)
      if (!fp) {
        this.fallback.push(entry)
        return
      }
      const map =
        fp.kind === 'id' ? this.byId : fp.kind === 'data' ? this.byDataAttr : this.byClass
      const list = map.get(fp.key)
      if (list) list.push(entry)
      else map.set(fp.key, [entry])
    })
  }

  getTags(): Tag[] {
    return this.tags
  }

  /** Match element, its parent, or direct children against known tag selectors */
  match(el: Element): Tag | null {
    const direct = this.matchExact(el)
    if (direct) return direct

    if (el.parentElement) {
      const parent = this.matchExact(el.parentElement)
      if (parent) return parent
    }

    const children = el.children
    for (let i = 0; i < children.length; i++) {
      const child = this.matchExact(children[i])
      if (child) return child
    }

    return null
  }

  private matchExact(el: Element): Tag | null {
    let best: IndexedTag | null = null
    const consider = (entries: IndexedTag[] | undefined) => {
      if (!entries) return
      for (const entry of entries) {
        if (best && entry.order >= best.order) continue
        if (safeMatches(el, entry.tag.selector) && matchesLocation(entry.tag)) best = entry
      }
    }
    const found = () => (best ? (best as IndexedTag).tag : null)

    if (el.id) consider(this.byId.get(el.id))
    if (best) return found()

    if (this.byDataAttr.size > 0) {
      const attrs = el.attributes
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        if (attr.name.startsWith('data-')) {
          consider(this.byDataAttr.get(dataKey(attr.name, attr.value)))
        }
      }
      if (best) return found()
    }

    if (this.byClass.size > 0 && el.classList) {
      for (let i = 0; i < el.classList.length; i++) {
        consider(this.byClass.get(el.classList[i]))
      }
      if (best) return found()
    }

    consider(this.fallback)
    return found()
  }

  clear() {
    this.tags = []
    this.byId.clear()
    this.byDataAttr.clear()
    this.byClass.clear()
    this.fallback = []
  }
}

function dataKey(name: string, value: string) {
  return `${name.toLowerCase()}=${value}`
}

/** Index of the matching closing bracket/paren, skipping quoted strings */
function skipGroup(s: string, i: number): number {
  const open = s[i]
  const close = open === '[' ? ']' : ')'
  let depth = 0
  for (; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      const end = s.indexOf(c, i + 1)
      if (end === -1) return -1
      i = end
    } else if (c === open) depth++
    else if (c === close && --depth === 0) return i
  }
  return -1
}

/** Last compound selector (after the last top-level combinator); null for selector lists */
function lastCompound(selector: string): string | null {
  const s = selector.trim()
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '[' || c === '(') {
      i = skipGroup(s, i)
      if (i === -1) return null
    } else if (c === '"' || c === "'") {
      return null
    } else if (c === ',') {
      return null
    } else if (c === '>' || c === '+' || c === '~' || /\s/.test(c)) {
      start = i + 1
    }
  }
  return s.slice(start) || null
}

const IDENT = /^-?[_a-zA-Z\u00A0-\uFFFF][\w\u00A0-\uFFFF-]*/
const ATTR_EQ = /^\s*([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'\]]+))\s*$/

/** Cheap lookup key for a selector, or null when one can't be derived safely */
function fingerprint(selector: string): Fingerprint | null {
  if (selector.includes('\\')) return null
  const compound = lastCompound(selector)
  if (!compound) return null
  let id: string | null = null
  let data: string | null = null
  let cls: string | null = null
  let i = 0
  while (i < compound.length) {
    const c = compound[i]
    if (c === '#' || c === '.') {
      const m = compound.slice(i + 1).match(IDENT)
      if (!m) return null
      if (c === '#') id = id ?? m[0]
      else cls = cls ?? m[0]
      i += 1 + m[0].length
    } else if (c === '[') {
      const end = skipGroup(compound, i)
      if (end === -1) return null
      const m = compound.slice(i + 1, end).match(ATTR_EQ)
      if (m && m[1].toLowerCase().startsWith('data-') && !data) {
        data = dataKey(m[1], m[2] ?? m[3] ?? m[4])
      }
      i = end + 1
    } else if (c === ':') {
      const m = compound.slice(i).match(/^::?[\w-]+/)
      if (!m) return null
      i += m[0].length
      if (compound[i] === '(') {
        const end = skipGroup(compound, i)
        if (end === -1) return null
        i = end + 1
      }
    } else if (c === '*') {
      i++
    } else {
      const m = compound.slice(i).match(IDENT)
      if (!m) return null
      i += m[0].length
    }
  }
  if (id) return { kind: 'id', key: id }
  if (data) return { kind: 'data', key: data }
  if (cls) return { kind: 'class', key: cls }
  return null
}

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector)
  } catch {
    return false
  }
}

export function matchesLocation(tag: { location?: string }): boolean {
  if (!tag.location) return true
  try {
    const loc = tag.location
    if (loc.startsWith('/')) {
      return window.location.pathname === loc
    }
    return window.location.href === loc
  } catch {
    return true
  }
}

export default TagMatcher
