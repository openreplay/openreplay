import type { Message } from './message'
import type { 
  RawMessage,
  RawSetNodeAttributeURLBased,
  RawSetNodeAttribute,
  RawSetCssDataURLBased,
  RawSetCssData,
  RawCssInsertRuleURLBased,
  RawCssInsertRule,
} from './raw'
import RawMessageReader from './RawMessageReader'
import type { RawMessageReaderI } from './RawMessageReader'
import { resolveURL, resolveCSS } from './urlResolve'


const resolveMsg = {
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
  })
}

export default class MStreamReader {
  constructor(private readonly r: RawMessageReaderI = new RawMessageReader()){}

  // append(buf: Uint8Array) {
  //   this.r.append(buf)
  // }

  private t0: number = 0
  private t: number = 0
  private idx: number = 0
  readNext(): Message | null {
    let msg = this.r.readMessage()
    if (msg === null) { return null }
    if (msg.tp === "timestamp" || msg.tp === "batch_meta") {
      this.t0 = this.t0 || msg.timestamp
      this.t = msg.timestamp - this.t0
      return this.readNext()
    }

    // why typescript doesn't work here?
    msg = (resolveMsg[msg.tp] || ((m:RawMessage)=>m))(msg)

    return Object.assign(msg, {
      time: this.t,
      _index: this.idx++,
    })
  }
}