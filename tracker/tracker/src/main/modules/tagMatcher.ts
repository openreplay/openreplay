export type Tag = { id: number; selector: string; location?: string }

/**
 * Two-tier tag matching:
 * 1. Fast fingerprint lookup by id, data-attr,
 *    or class from the selector's last segment
 * 2. Fallback iteration using native element.matches()
 */
class TagMatcher {
  private tags: Tag[] = []
  private byId: Map<string, Tag> = new Map()
  private byDataAttr: Map<string, Tag> = new Map()
  private byClass: Map<string, Tag> = new Map()
  private fallback: Tag[] = []

  setTags(tags: Tag[]) {
    this.tags = tags
    this.byId.clear()
    this.byDataAttr.clear()
    this.byClass.clear()
    this.fallback = []

    for (const tag of tags) {
      const last = lastSegment(tag.selector)
      if (!last) {
        this.fallback.push(tag)
        continue
      }

      if (last.startsWith('#')) {
        this.byId.set(last.slice(1), tag)
      } else if (last.startsWith('[data-')) {
        this.byDataAttr.set(last, tag)
      } else {
        const cls = extractClass(last)
        if (cls) {
          this.byClass.set(cls, tag)
        } else {
          this.fallback.push(tag)
        }
      }
    }
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
    if (el.id && this.byId.has(el.id)) {
      const tag = this.byId.get(el.id)!
      if (safeMatches(el, tag.selector) && matchesLocation(tag)) return tag
    }

    if (this.byDataAttr.size > 0) {
      const attrs = el.attributes
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        if (attr.name.startsWith('data-')) {
          const key = `[${attr.name}="${attr.value}"]`
          if (this.byDataAttr.has(key)) {
            const tag = this.byDataAttr.get(key)!
            if (safeMatches(el, tag.selector) && matchesLocation(tag)) return tag
          }
        }
      }
    }

    if (this.byClass.size > 0 && el.classList) {
      for (let i = 0; i < el.classList.length; i++) {
        const cls = el.classList[i]
        if (this.byClass.has(cls)) {
          const tag = this.byClass.get(cls)!
          if (safeMatches(el, tag.selector) && matchesLocation(tag)) return tag
        }
      }
    }

    for (const tag of this.fallback) {
      if (safeMatches(el, tag.selector) && matchesLocation(tag)) return tag
    }

    return null
  }

  clear() {
    this.tags = []
    this.byId.clear()
    this.byDataAttr.clear()
    this.byClass.clear()
    this.fallback = []
  }
}

/** Last combinator-separated segment of a CSS selector */
function lastSegment(selector: string): string | null {
  const trimmed = selector.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s*[>+~ ]\s*/)
  const last = parts[parts.length - 1]?.trim()
  return last || null
}

/** First class name from a selector segment, e.g. "div.my-class" -> "my-class" */
function extractClass(segment: string): string | null {
  const match = segment.match(/\.([a-zA-Z_-][\w-]*)/)
  return match ? match[1] : null
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
