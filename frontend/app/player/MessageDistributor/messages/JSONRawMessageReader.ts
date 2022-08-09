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
import { TP_MAP } from './raw'
import { resolveURL, resolveCSS } from './urlResolve'


// TODO: commonURLBased logic
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
  })
} as const

type ResolvingTypes = keyof typeof resolvers
type Resolver = typeof resolvers[ResolvingTypes]

type NumTypes = keyof typeof TP_MAP

export default class JSONRawMessageReader {
  constructor(private messages: any[] = []){}
  append(messages: any[]) {
    this.messages = this.messages.concat(messages)
  }
  readMessage(): RawMessage | null {
    let msg = this.messages.shift()
    if (!msg) { return null }
    const type = TP_MAP[msg._id as NumTypes]
    if (!type) { // Ignore unknown message types
      // log here
      return this.readMessage()
    }
    msg.tp = type
    delete msg._id

    const resolver: Resolver | undefined = resolvers[type as ResolvingTypes]
    if (resolver) {
      msg = resolver(msg)
    }
    return msg as RawMessage
  }

}