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
} from './raw'
import type { TrackerMessage } from './tracker'
import  translate from './tracker'
import { TP_MAP } from './tracker-legacy'
import { resolveURL, resolveCSS } from './urlResolve'


function legacyTranslate(msg: any): RawMessage | null {
  const type = TP_MAP[msg._id as keyof typeof TP_MAP]
  if (!type) {
    return null
  }
  msg.tp = type
  delete msg._id
  return msg as RawMessage
}


// TODO: commonURLBased logic for feilds
const resolvers = {
  "set_node_attribute_url_based": (msg: RawSetNodeAttributeURLBased): RawSetNodeAttribute =>
  ({
    ...msg,
    value: msg.name === 'src' || msg.name === 'href'
      ? resolveURL(msg.baseURL, msg.value)
      : (msg.name === 'style'
        ? resolveCSS(msg.baseURL, msg.value)
        : msg.value
        ),
    tp: "set_node_attribute",
  }),
  "set_css_data_url_based": (msg: RawSetCssDataURLBased): RawSetCssData =>
  ({
    ...msg,
    data: resolveCSS(msg.baseURL, msg.data),
    tp: "set_css_data",
  }),
  "css_insert_rule_url_based": (msg: RawCssInsertRuleURLBased): RawCssInsertRule =>
  ({
    ...msg,
    rule: resolveCSS(msg.baseURL, msg.rule),
    tp: "css_insert_rule",
  }),
  "adopted_ss_insert_rule_url_based": (msg: RawAdoptedSsInsertRuleURLBased): RawAdoptedSsInsertRule =>
  ({
    ...msg,
    rule: resolveCSS(msg.baseURL, msg.rule),
    tp: "adopted_ss_insert_rule",
  }),
  "adopted_ss_replace_url_based": (msg: RawAdoptedSsReplaceURLBased): RawAdoptedSsReplace =>
  ({
    ...msg,
    text: resolveCSS(msg.baseURL, msg.text),
    tp: "adopted_ss_replace"
  }),
} as const

type ResolvableType = keyof typeof resolvers
type ResolvableRawMessage = RawMessage & { tp: ResolvableType }

function isResolvable(msg: RawMessage): msg is ResolvableRawMessage {
  //@ts-ignore
  return resolvers[msg.tp] !== undefined
}


export default class JSONRawMessageReader {
  constructor(private messages: TrackerMessage[] = []){}
  append(messages: TrackerMessage[]) {
    this.messages = this.messages.concat(messages)
  }
  readMessage(): RawMessage | null {
    let msg = this.messages.shift()
    if (!msg) { return null }
    const rawMsg = Array.isArray(msg)
      ? translate(msg)
      : legacyTranslate(msg)
    if (!rawMsg) {
      return this.readMessage()
    }
    if (isResolvable(rawMsg)) {
      //@ts-ignore ??? too complex typscript...
      return resolvers[rawMsg.tp](rawMsg)
    }
    return rawMsg
  }

}
