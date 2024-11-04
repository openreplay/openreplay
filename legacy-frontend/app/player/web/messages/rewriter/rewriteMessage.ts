import type {
  RawMessage,
  RawSetNodeAttributeURLBased,
  RawSetNodeAttribute,
  RawSetCssDataURLBased,
  RawSetCssData,
  RawCssInsertRuleURLBased,
  RawCssInsertRule,
  RawAdoptedSsInsertRuleURLBased,
  RawAdoptedSsInsertRule,
  RawAdoptedSsReplaceURLBased,
  RawAdoptedSsReplace,
} from '../raw.gen'
import { MType } from '../raw.gen'
import { resolveURL, resolveCSS } from './urlResolve'
import { HOVER_CLASSNAME, FOCUS_CLASSNAME } from './constants'

/* maybetodo:  filter out non-relevant  prefixes in CSS-rules. 
   They might cause an error in console, but not sure if it breaks the replay.
   (research required)
*/
// function replaceCSSPrefixes(css: string) {
//   return css
//     .replace(/\-ms\-/g, "")
//     .replace(/\-webkit\-/g, "")
//     .replace(/\-moz\-/g, "")
//     .replace(/\-webkit\-/g, "")
// }

const HOVER_SELECTOR = `.${HOVER_CLASSNAME}`
const FOCUS_SELECTOR = `.${FOCUS_CLASSNAME}`
export function replaceCSSPseudoclasses(cssText: string): string {
  return cssText
    .replace('/\:hover/g', HOVER_SELECTOR)
    .replace('/\:focus/g', FOCUS_SELECTOR)
}
function rewriteCSS(baseURL: string, cssText: string): string {
  return replaceCSSPseudoclasses(resolveCSS(baseURL, cssText))
}

// TODO: common logic for URL fields in all the ...URLBased messages
const REWRITERS = {
  [MType.SetNodeAttributeURLBased]: (msg: RawSetNodeAttributeURLBased): RawSetNodeAttribute =>
  ({
    ...msg,
    value: msg.name === 'src' || msg.name === 'href'
      ? resolveURL(msg.baseURL, msg.value)
      : (msg.name === 'style'
        ? rewriteCSS(msg.baseURL, msg.value)
        : msg.value
        ),
    tp: MType.SetNodeAttribute,
  }),
  [MType.SetCssDataURLBased]: (msg: RawSetCssDataURLBased): RawSetCssData =>
  ({
    ...msg,
    data: rewriteCSS(msg.baseURL, msg.data),
    tp: MType.SetCssData,
  }),
  [MType.CssInsertRuleURLBased]: (msg: RawCssInsertRuleURLBased): RawCssInsertRule =>
  ({
    ...msg,
    rule: rewriteCSS(msg.baseURL, msg.rule),
    tp: MType.CssInsertRule,
  }),
  [MType.AdoptedSsInsertRuleURLBased]: (msg: RawAdoptedSsInsertRuleURLBased): RawAdoptedSsInsertRule =>
  ({
    ...msg,
    rule: rewriteCSS(msg.baseURL, msg.rule),
    tp: MType.AdoptedSsInsertRule,
  }),
  [MType.AdoptedSsReplaceURLBased]: (msg: RawAdoptedSsReplaceURLBased): RawAdoptedSsReplace =>
  ({
    ...msg,
    text: rewriteCSS(msg.baseURL, msg.text),
    tp: MType.AdoptedSsReplace,
  }),
} as const


export default function rewriteMessage(msg: RawMessage): RawMessage {
	// @ts-ignore --- any idea for correct typing?
	if (REWRITERS[msg.tp]) {
		// @ts-ignore
		return REWRITERS[msg.tp](msg)
	}
	return msg
}