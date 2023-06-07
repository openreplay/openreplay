import type App from './index.js'
import { stars, hasOpenreplayAttribute } from '../utils.js'
import { isElementNode } from './guards.js'

export enum SanitizeLevel {
  Plain,
  Obscured,
  Hidden,
}

export interface Options {
  obscureTextEmails: boolean
  obscureTextNumbers: boolean
  domSanitizer?: (node: Element) => SanitizeLevel
}

export const stringWiper = (input: string) =>
  input
    .trim()
    .replace(/[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, '█')

export default class Sanitizer {
  private readonly obscured: Set<number> = new Set()
  private readonly hidden: Set<number> = new Set()
  private readonly options: Options

  constructor(private readonly app: App, options: Partial<Options>) {
    this.options = Object.assign(
      {
        obscureTextEmails: true,
        obscureTextNumbers: false,
      },
      options,
    )
  }

  handleNode(id: number, parentID: number, node: Node) {
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
      data = data.replace(/^\w+([.-]\w+)*@\w+([.-]\w+)*\.\w{2,3}$/g, (email) => {
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
