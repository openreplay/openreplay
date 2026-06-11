import type App from './index.js'
import { stars, hasOpenreplayAttribute } from '../utils.js'
import { isElementNode, isTextNode } from './guards.js'

export enum SanitizeLevel {
  Plain,
  Obscured,
  Hidden,
}

export interface Options {
  /**
   * Sanitize emails in text DOM nodes
   *
   * (for inputs, look for obscureInputEmails)
   * */
  obscureTextEmails: boolean
  /**
   * Sanitize emails in text DOM nodes
   *
   * (for inputs, look for obscureInputNumbers)
   * */
  obscureTextNumbers: boolean
  /**
   * Sanitize the DOM node based on the returned level
   * (Plain = 0, Obscured = 1, Hidden = 2)
   *
   * higher security levels will override other settings or data-params.
   *
   * @param node - the DOM node to sanitize
   * @returns the level of sanitization to apply
   *
   * */
  domSanitizer?: (node: Element) => SanitizeLevel
  /**
   * private by default mode that will mask all elements not marked by data-openreplay-unmask
   * */
  privateMode?: boolean
}

export const stringWiper = (input: string) =>
  input
    .trim()
    .replace(/[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\s]/g, '*')

export default class Sanitizer {
  // Node id -> level. Plain (0) is never stored; a missing entry means Plain.
  // A map (not the old grow-only Sets) so levels can be raised and lowered.
  private readonly levels: Map<number, SanitizeLevel> = new Map()
  private readonly options: Options
  public readonly privateMode: boolean
  private readonly app: App

  constructor(params: { app: App; options?: Partial<Options> }) {
    this.app = params.app
    const defaultOptions: Options = {
      obscureTextEmails: true,
      obscureTextNumbers: false,
      privateMode: false,
      domSanitizer: undefined,
    }
    this.privateMode = params.options?.privateMode ?? false
    this.options = Object.assign(defaultOptions, params.options)
  }

  // Pure recomputation of a node's level from the live DOM + parent level.
  // Reading current state on every call is what lets resanitize() pick up
  // runtime attribute/domSanitizer changes.
  computeLevel(node: Node, parentLevel: SanitizeLevel): SanitizeLevel {
    if (this.options.privateMode) {
      if (isElementNode(node) && !hasOpenreplayAttribute(node, 'unmask')) {
        return SanitizeLevel.Obscured
      }
      if (isTextNode(node) && !hasOpenreplayAttribute(node.parentNode as Element, 'unmask')) {
        return SanitizeLevel.Obscured
      }
    }

    let level: SanitizeLevel = SanitizeLevel.Plain

    if (
      parentLevel >= SanitizeLevel.Obscured ||
      (isElementNode(node) &&
        (hasOpenreplayAttribute(node, 'masked') || hasOpenreplayAttribute(node, 'obscured')))
    ) {
      level = SanitizeLevel.Obscured
    }
    if (
      parentLevel === SanitizeLevel.Hidden ||
      (isElementNode(node) &&
        (hasOpenreplayAttribute(node, 'htmlmasked') || hasOpenreplayAttribute(node, 'hidden')))
    ) {
      level = SanitizeLevel.Hidden
    }

    if (this.options.domSanitizer !== undefined && isElementNode(node)) {
      const sanitizeLevel = this.options.domSanitizer(node)
      if (sanitizeLevel === SanitizeLevel.Obscured && level < SanitizeLevel.Obscured) {
        level = SanitizeLevel.Obscured
      }
      if (sanitizeLevel === SanitizeLevel.Hidden) {
        level = SanitizeLevel.Hidden
      }
    }

    return level
  }

  getLevel(id: number): SanitizeLevel {
    return this.levels.get(id) ?? SanitizeLevel.Plain
  }

  // Sets a node's level (either direction) and returns the previous one.
  setLevel(id: number, level: SanitizeLevel): SanitizeLevel {
    const prev = this.getLevel(id)
    if (level === SanitizeLevel.Plain) {
      this.levels.delete(id)
    } else {
      this.levels.set(id, level)
    }
    return prev
  }

  handleNode(id: number, parentID: number, node: Node) {
    const level = this.computeLevel(node, this.getLevel(parentID))
    // Escalate-only: commits never lower a level, only resanitize/setLevel do.
    if (level > this.getLevel(id)) {
      this.setLevel(id, level)
    }
  }

  sanitize(id: number, data: string): string {
    if (this.getLevel(id) >= SanitizeLevel.Obscured) {
      // TODO: is it the best place to put trim() ? Might trimmed spaces be considered in layout in certain cases?
      return stringWiper(data)
    }

    if (this.options.obscureTextNumbers) {
      data = data.replace(/\d/g, '0')
    }
    if (this.options.obscureTextEmails) {
      data = data.replace(/^\w+([+.-]\w+)*@\w+([.-]\w+)*\.\w{2,3}$/g, (email) => {
        const [name, domain] = email.split('@')
        const [domainName, host] = domain.split('.')
        return `${stars(name)}@${stars(domainName)}.${stars(host)}`
      })
    }
    return data
  }

  isObscured(id: number): boolean {
    return this.getLevel(id) >= SanitizeLevel.Obscured
  }

  isHidden(id: number) {
    return this.getLevel(id) === SanitizeLevel.Hidden
  }

  getInnerTextSecure(el: HTMLElement): string {
    const id = this.app.nodes.getID(el)
    if (!id) {
      return ''
    }
    return this.sanitize(id, el.innerText)
  }

  clear(): void {
    this.levels.clear()
  }
}
