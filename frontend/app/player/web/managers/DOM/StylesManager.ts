import type Screen from '../../Screen/Screen';
import { replaceCSSPseudoclasses } from '../../messages/rewriter/rewriteMessage'

// Doesn't work with css files (hasOwnProperty returns false)
// TODO: recheck and remove if true
function rewriteNodeStyleSheet(doc: Document, node: HTMLLinkElement | HTMLStyleElement) {
  const ss = Object.values(doc.styleSheets).find(s => s.ownerNode === node);
  if (!ss || !ss.hasOwnProperty('rules')) { return; }
  for(let i = 0; i < ss.cssRules.length; i++){
    const r = ss.cssRules[i]
    if (r instanceof CSSStyleRule) {
      r.selectorText = replaceCSSPseudoclasses(r.selectorText)
    }
  }
}

export default class StylesManager {
  private linkLoadingCount: number = 0;
  private linkLoadPromises: Array<Promise<void>> = [];
  private skipCSSLinks: Array<string> = []; // should be common for all pages
  private abortController = new AbortController()

  constructor(private readonly screen: Screen, private readonly setLoading: (flag: boolean) => void) {}

  reset():void {
    this.linkLoadingCount = 0;
    this.linkLoadPromises = [];

    this.abortController.abort();
    this.abortController = new AbortController();
  }

  setStyleHandlers(node: HTMLLinkElement, value: string): void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>((resolve) => {
      if (
        this.abortController.signal.aborted
        || this.skipCSSLinks.includes(value)
        ||  node.ownerDocument !== this.screen.document
      ) {
        console.log('skipped', node, value, this.abortController.signal.aborted, this.skipCSSLinks.includes(value), node.ownerDocument !== this.screen.document)
        resolve();
      }
      this.setLoading(true);
      this.linkLoadingCount++;
      const addSkipAndResolve = (e: any) => {
        this.skipCSSLinks.push(value); // watch out
        console.error('skip node', e)
        resolve()
      }
      timeoutId = setTimeout(addSkipAndResolve, 4000);

      // It would be better to make it more relyable with addEventListener
      node.onload = () => {
        const doc = this.screen.document;
        if (node.ownerDocument === doc && doc) {
           rewriteNodeStyleSheet(doc, node);
        }
        resolve();
      }
      node.onerror = addSkipAndResolve;
      this.abortController.signal.addEventListener('abort', () => {
        node.onload = null;
        node.onerror = null;
        clearTimeout(timeoutId);
        resolve();
      });
    }).then(() => {
      node.onload = null;
      node.onerror = null;
      clearTimeout(timeoutId);
      this.linkLoadingCount--;
      if (this.linkLoadingCount === 0) {
        setTimeout(() => {
          this.setLoading(false)
          this.linkLoadPromises = [];
        }, 0)
      }
    });
    this.linkLoadPromises.push(promise);
  }

  moveReady(): Promise<void[]> {
    if (this.linkLoadingCount > 0) {
      return Promise.all(this.linkLoadPromises)
    } else {
      return Promise.resolve([])
    }
  }
}
