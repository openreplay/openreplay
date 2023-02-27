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
} from './raw.gen'
import { MType } from './raw.gen'
import { resolveURL, resolveCSS } from './urlResolve'

// type PickMessage<T extends MType> = Extract<RawMessage, { tp: T }>;
// type ResolversMap = {
//   [Key in MType]: (event: PickMessage<Key>) => RawMessage
// }

// TODO: commonURLBased logic for feilds
const resolvers = {
  [MType.SetNodeAttributeURLBased]: (msg: RawSetNodeAttributeURLBased): RawSetNodeAttribute =>
  ({
    ...msg,
    value: msg.name === 'src' || msg.name === 'href'
      ? resolveURL(msg.baseURL, msg.value)
      : (msg.name === 'style'
        ? resolveCSS(msg.baseURL, msg.value)
        : msg.value
        ),
    tp: MType.SetNodeAttribute,
  }),
  [MType.SetCssDataURLBased]: (msg: RawSetCssDataURLBased): RawSetCssData =>
  ({
    ...msg,
    data: resolveCSS(msg.baseURL, msg.data),
    tp: MType.SetCssData,
  }),
  [MType.CssInsertRuleURLBased]: (msg: RawCssInsertRuleURLBased): RawCssInsertRule =>
  ({
    ...msg,
    rule: resolveCSS(msg.baseURL, msg.rule),
    tp: MType.CssInsertRule,
  }),
  [MType.AdoptedSsInsertRuleURLBased]: (msg: RawAdoptedSsInsertRuleURLBased): RawAdoptedSsInsertRule =>
  ({
    ...msg,
    rule: resolveCSS(msg.baseURL, msg.rule),
    tp: MType.AdoptedSsInsertRule,
  }),
  [MType.AdoptedSsReplaceURLBased]: (msg: RawAdoptedSsReplaceURLBased): RawAdoptedSsReplace =>
  ({
    ...msg,
    text: resolveCSS(msg.baseURL, msg.text),
    tp: MType.AdoptedSsReplace,
  }),
} as const


export default function resolve(msg: RawMessage): RawMessage {
	// @ts-ignore --- any idea?
	if (resolvers[msg.tp]) {
		// @ts-ignore
		return resolvers[msg.tp](msg)
	}
	return msg
}