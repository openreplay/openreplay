import type StatedScreen from '../../StatedScreen';
import type { CssInsertRule, CssDeleteRule, ReplaceVcss } from '../../messages';

type CSSRuleMessage = CssInsertRule | CssDeleteRule | ReplaceVcss;

import ListWalker from '../ListWalker';


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

export default class StylesManager extends ListWalker<CSSRuleMessage> {
  private linkLoadingCount: number = 0;
  private linkLoadPromises: Array<Promise<void>> = [];
  private skipCSSLinks: Array<string> = []; // should be common for all pages

  constructor(private readonly screen: StatedScreen) {
    super();
  }

  reset():void {
    super.reset();
    this.linkLoadingCount = 0;
    this.linkLoadPromises = [];

    //cancel all promises? tothinkaboutit
  }

  setStyleHandlers(node: HTMLLinkElement, value: string): void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>((resolve) => {
      if (this.skipCSSLinks.includes(value)) resolve();
      this.linkLoadingCount++;
      this.screen.setCSSLoading(true);
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
        this.screen.setCSSLoading(false);
      }
    });
    this.linkLoadPromises.push(promise);
  }

  private manageRule = (msg: CSSRuleMessage):void => {
    // if (msg.tp === "css_insert_rule") {
    //   let styleSheet = this.#screen.document.styleSheets[ msg.stylesheetID ];
    //   if (!styleSheet) {
    //     logger.log("No stylesheet with corresponding ID found: ", msg)
    //     styleSheet = this.#screen.document.styleSheets[0];
    //     if (!styleSheet) {
    //       return;
    //     }
    //   }
    //   try {
    //     styleSheet.insertRule(msg.rule, msg.index);
    //   } catch (e) {
    //     logger.log(e, msg)
    //     //const index = Math.min(msg.index, styleSheet.cssRules.length);
    //     styleSheet.insertRule(msg.rule, styleSheet.cssRules.length);
    //     //styleSheet.ownerNode.innerHTML += msg.rule;
    //   }
    // }
    // if (msg.tp === "css_delete_rule") {
    //   // console.warn('Warning: STYLESHEET_DELETE_RULE msg')
    //   const styleSheet = this.#screen.document.styleSheets[msg.stylesheetID];
    //   if (!styleSheet) {
    //     logger.log("No stylesheet with corresponding ID found: ", msg)
    //     return;
    //   }
    //   styleSheet.deleteRule(msg.index);
    // }
  }

  moveReady(t: number): Promise<void> {
    return Promise.all(this.linkLoadPromises)
      .then(() => this.moveApply(t, this.manageRule));
  }
}
