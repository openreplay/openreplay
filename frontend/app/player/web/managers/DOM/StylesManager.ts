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

  constructor(private readonly screen: Screen, private readonly setLoading: (flag: boolean) => void) {}

  reset():void {
    this.linkLoadingCount = 0;
    this.linkLoadPromises = [];

    //cancel all promises? thinkaboutit
  }

  setStyleHandlers(node: HTMLLinkElement, value: string): void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>((resolve) => {
      if (this.skipCSSLinks.includes(value)) resolve();
      this.linkLoadingCount++;
      this.setLoading(true);
      const addSkipAndResolve = () => {
        this.skipCSSLinks.push(value); // watch out
        resolve()
      }
      timeoutId = setTimeout(addSkipAndResolve, 4000);

      // It would be better to make it more relyable with addEventListener
      node.onload = () => {
        const doc = this.screen.document;
        doc && rewriteNodeStyleSheet(doc, node);
        resolve();
      }
      node.onerror = addSkipAndResolve;
    }).then(() => {
      node.onload = null;
      node.onerror = null;
      clearTimeout(timeoutId);
      this.linkLoadingCount--;
      if (this.linkLoadingCount === 0) {
        this.setLoading(false);
      }
    });
    this.linkLoadPromises.push(promise);
  }

  moveReady(t: number): Promise<void[]> {
    return Promise.all(this.linkLoadPromises)
  }
}
