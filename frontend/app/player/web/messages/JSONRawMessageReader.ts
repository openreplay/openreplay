import type { RawMessage } from './raw.gen'
import type { TrackerMessage } from './tracker.gen'
import  translate from './tracker.gen'
import { TP_MAP } from './tracker-legacy.gen'
import rewriteMessage from './rewriter/rewriteMessage'


function legacyTranslate(msg: any): RawMessage | null {
  const type = TP_MAP[msg._id as keyof typeof TP_MAP]
  if (!type) { // msg._id can be other than keyof TP_MAP, in fact
    return null
  }
  msg.tp = type
  delete msg._id
  return msg as RawMessage
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
    return rewriteMessage(rawMsg)
  }

}
