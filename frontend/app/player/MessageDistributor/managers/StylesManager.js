// @flow

import type StatedScreen from '../StatedScreen';
import type { CssInsertRule, CssDeleteRule } from '../messages';
import type { Timed } from '../Timed';

type CSSRuleMessage = CssInsertRule | CssDeleteRule;
type TimedCSSRuleMessage = Timed & CSSRuleMessage;

import logger from 'App/logger';
import ListWalker from './ListWalker';

export default class StylesManager extends ListWalker<TimedCSSRuleMessage> {
  #screen: StatedScreen;
  _linkLoadingCount: number = 0;
  _linkLoadPromises: Array<Promise<void>> = [];
  _skipCSSLinks: Array<string> = []; // should be common for all pages

  constructor(screen: StatedScreen) {
    super();
    this.#screen = screen;
  }

  reset():void {
    super.reset();
    this._linkLoadingCount = 0;
    this._linkLoadPromises = [];

    //cancel all promises? tothinkaboutit
  }

  setStyleHandlers(node: HTMLLinkElement, value: string): void {
    let timeoutId;
    const promise = new Promise((resolve) => {
      if (this._skipCSSLinks.includes(value)) resolve();
      this._linkLoadingCount++;
      this.#screen.setCSSLoading(true);
      const setSkipAndResolve = () => {
        this._skipCSSLinks.push(value); // watch out
        resolve();
      }
      timeoutId = setTimeout(setSkipAndResolve, 4000);

      node.onload = resolve;
      node.onerror = setSkipAndResolve;
    }).then(() => {
      node.onload = null;
      node.onerror = null;
      clearTimeout(timeoutId);
      this._linkLoadingCount--;
      if (this._linkLoadingCount === 0) {
        this.#screen.setCSSLoading(false);
      }
    });
    this._linkLoadPromises.push(promise);
  }

  #manageRule = (msg: CSSRuleMessage):void => {
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
    return Promise.all(this._linkLoadPromises)
      .then(() => this.moveApply(t, this.#manageRule));
  }
}