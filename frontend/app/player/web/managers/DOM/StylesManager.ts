import type Screen from '../../Screen/Screen';
import type { CssInsertRule, CssDeleteRule } from '../../messages';

type CSSRuleMessage = CssInsertRule | CssDeleteRule;

const HOVER_CN = "-openreplay-hover";
const HOVER_SELECTOR = `.${HOVER_CN}`;

// Doesn't work with css files (hasOwnProperty)
export function rewriteNodeStyleSheet(doc: Document, node: HTMLLinkElement | HTMLStyleElement) {
  const ss = Object.values(doc.styleSheets).find(s => s.ownerNode === node);
  if (!ss || !ss.hasOwnProperty('rules')) { return; }
  for(let i = 0; i < ss.rules.length; i++){
    const r = ss.rules[i]
    if (r instanceof CSSStyleRule) {
      r.selectorText = r.selectorText.replace('/\:hover/g', HOVER_SELECTOR)
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

    //cancel all promises? tothinkaboutit
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
