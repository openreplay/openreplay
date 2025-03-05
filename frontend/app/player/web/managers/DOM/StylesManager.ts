import type Screen from 'App/player/web/Screen/Screen';
import { replaceCSSPseudoclasses } from 'App/player/web/messages/rewriter/rewriteMessage';
import logger from 'App/logger';

// Doesn't work with css files (hasOwnProperty returns false)
// TODO: recheck and remove if true
function rewriteNodeStyleSheet(
  doc: Document,
  node: HTMLLinkElement | HTMLStyleElement,
) {
  const ss = Object.values(doc.styleSheets).find((s) => s.ownerNode === node);
  if (!ss || !ss.hasOwnProperty('rules')) {
    return;
  }
  for (let i = 0; i < ss.cssRules.length; i++) {
    const r = ss.cssRules[i];
    if (r instanceof CSSStyleRule) {
      r.selectorText = replaceCSSPseudoclasses(r.selectorText);
    }
  }
}

export default class StylesManager {
  private linkLoadingCount: number = 0;

  private linkLoadPromises: Array<Promise<void>> = [];

  private skipCSSLinks: Array<string> = [];

  constructor(
    private readonly screen: Screen,
    private readonly setLoading: (flag: boolean) => void,
  ) {}

  reset(): void {
    this.linkLoadingCount = 0;
    this.linkLoadPromises = [];
  }

  setStyleHandlers(node: HTMLLinkElement, value: string): void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>((resolve) => {
      if (this.skipCSSLinks.includes(value)) resolve();
      this.linkLoadingCount++;
      this.setLoading(true);
      const addSkipAndResolve = (e: any) => {
        this.skipCSSLinks.push(value);
        logger.error('skip node', e);
        resolve();
      };
      timeoutId = setTimeout(() => addSkipAndResolve('by timeout'), 5000);

      node.onload = () => {
        const doc = this.screen.document;
        if (node.ownerDocument === doc && doc) {
          rewriteNodeStyleSheet(doc, node);
        }
        resolve();
      };
      node.onerror = addSkipAndResolve;
    }).then(() => {
      node.onload = null;
      node.onerror = null;
      clearTimeout(timeoutId);
      this.linkLoadingCount--;
      if (this.linkLoadingCount === 0) {
        this.setLoading(false);
        this.linkLoadPromises = [];
      }
    });
    this.linkLoadPromises.push(promise);
  }

  moveReady(): Promise<void[]> {
    if (this.linkLoadingCount > 0) {
      return Promise.all(this.linkLoadPromises);
    }
    return Promise.resolve([]);
  }
}
