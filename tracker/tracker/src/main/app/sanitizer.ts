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
    .replace(/[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, '*')

export default class Sanitizer {
  private readonly obscured: Set<number> = new Set()
  private readonly hidden: Set<number> = new Set()
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

  handleNode(id: number, parentID: number, node: Node) {
    if (this.options.privateMode) {
      if (isElementNode(node) && !hasOpenreplayAttribute(node, 'unmask')) {
        return this.obscured.add(id)
      }
      if (isTextNode(node) && !hasOpenreplayAttribute(node.parentNode as Element, 'unmask')) {
        return this.obscured.add(id)
      }
    }

    if (
      this.obscured.has(parentID) ||
      (isElementNode(node) &&
        (hasOpenreplayAttribute(node, 'masked') || hasOpenreplayAttribute(node, 'obscured')))
    ) {
      this.obscured.add(id)
    }
    if (
      this.hidden.has(parentID) ||
      (isElementNode(node) &&
        (hasOpenreplayAttribute(node, 'htmlmasked') || hasOpenreplayAttribute(node, 'hidden')))
    ) {
      this.hidden.add(id)
    }

    if (this.options.domSanitizer !== undefined && isElementNode(node)) {
      const sanitizeLevel = this.options.domSanitizer(node)
      if (sanitizeLevel === SanitizeLevel.Obscured) {
        this.obscured.add(id)
      }
      if (sanitizeLevel === SanitizeLevel.Hidden) {
        this.hidden.add(id)
      }
    }
  }

  sanitize(id: number, data: string): string {
    if (this.obscured.has(id)) {
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
    return this.obscured.has(id)
  }

  isHidden(id: number) {
    return this.hidden.has(id)
  }

  getInnerTextSecure(el: HTMLElement): string {
    const id = this.app.nodes.getID(el)
    if (!id) {
      return ''
    }
    return this.sanitize(id, el.innerText)
  }

  clear(): void {
    this.obscured.clear()
    this.hidden.clear()
  }
}
