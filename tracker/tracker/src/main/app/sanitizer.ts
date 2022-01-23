import { stars, hasOpenreplayAttribute } from "../utils.js";
import App from "./index.js";
import { isInstance } from "./context.js";

export interface Options {
  obscureTextEmails: boolean;
  obscureTextNumbers: boolean;
}

export default class Sanitizer {
  private readonly masked: Set<number> = new Set();
  private readonly options: Options;

  constructor(private readonly app: App, options: Partial<Options>) {
    this.options = Object.assign({
      obscureTextEmails: true,
      obscureTextNumbers: false,
    }, options);
  }

  handleNode(id: number, parentID: number, node: Node) {
    if (
        this.masked.has(parentID) ||
        (isInstance(node, Element) && hasOpenreplayAttribute(node, 'masked'))
      ) {
        this.masked.add(id);
      }
  }

  sanitize(id: number, data: string): string {
    if (this.masked.has(id)) {
      // TODO: is it the best place to put trim() ? Might trimmed spaces be considered in layout in certain cases?
      return data.trim().replace(
        /[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g,
        '█',
      );
    } 
    if (this.options.obscureTextNumbers) {
      data = data.replace(/\d/g, '0');
    }
    if (this.options.obscureTextEmails) {
      data = data.replace(
        /([^\s]+)@([^\s]+)\.([^\s]+)/g,
        (...f: Array<string>) =>
          stars(f[1]) + '@' + stars(f[2]) + '.' + stars(f[3]),
      );
    }
    return data
  }

  isMasked(id: number): boolean {
    return this.masked.has(id);
  }

  getInnerTextSecure(el: HTMLElement): string {
    const id = this.app.nodes.getID(el)
    if (!id) { return '' }
    return this.sanitize(id, el.innerText)

  }

  clear(): void {
    this.masked.clear();
  }

}