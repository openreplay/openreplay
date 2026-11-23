import type {
  RawMessage,
  RawSetNodeAttributeURLBased,
  RawSetNodeAttribute,
  RawSetCssDataURLBased,
  RawSetCssData,
  RawAdoptedSsInsertRuleURLBased,
  RawAdoptedSsInsertRule,
  RawAdoptedSsReplaceURLBased,
  RawAdoptedSsReplace,
} from '../raw.gen';
import { MType } from '../raw.gen';
import { resolveURL, resolveCSS } from './urlResolve';

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

// TODO: common logic for URL fields in all the ...URLBased messages
const REWRITERS = {
  [MType.SetNodeAttributeURLBased]: (
    msg: RawSetNodeAttributeURLBased,
  ): RawSetNodeAttribute => ({
    ...msg,
    value:
      msg.name === 'src' || msg.name === 'href'
        ? resolveURL(msg.baseURL, msg.value)
        : msg.name === 'style'
          ? resolveCSS(msg.baseURL, msg.value)
          : msg.value,
    tp: MType.SetNodeAttribute,
  }),
  [MType.SetCssDataURLBased]: (msg: RawSetCssDataURLBased): RawSetCssData => ({
    ...msg,
    data: resolveCSS(msg.baseURL, msg.data),
    tp: MType.SetCssData,
  }),
  [MType.AdoptedSsInsertRuleURLBased]: (
    msg: RawAdoptedSsInsertRuleURLBased,
  ): RawAdoptedSsInsertRule => ({
    ...msg,
    rule: resolveCSS(msg.baseURL, msg.rule),
    tp: MType.AdoptedSsInsertRule,
  }),
  [MType.AdoptedSsReplaceURLBased]: (
    msg: RawAdoptedSsReplaceURLBased,
  ): RawAdoptedSsReplace => ({
    ...msg,
    text: resolveCSS(msg.baseURL, msg.text),
    tp: MType.AdoptedSsReplace,
  }),
} as const;

export default function rewriteMessage(msg: RawMessage): RawMessage {
  // @ts-ignore --- any idea for correct typing?
  if (REWRITERS[msg.tp]) {
    // @ts-ignore
    return REWRITERS[msg.tp](msg);
  }
  return msg;
}
