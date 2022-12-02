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
import type { TrackerMessage } from './tracker.gen'
import { MType } from './raw.gen'
import  translate from './tracker.gen'
import { TP_MAP } from './tracker-legacy.gen'
import { resolveURL, resolveCSS } from './urlResolve'


function legacyTranslate(msg: any): RawMessage | null {
  const type = TP_MAP[msg._id as keyof typeof TP_MAP]
  if (!type) { // msg._id can be other than keyof TP_MAP, in fact
    return null
  }
  msg.tp = type
  delete msg._id
  return msg as RawMessage
}


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
