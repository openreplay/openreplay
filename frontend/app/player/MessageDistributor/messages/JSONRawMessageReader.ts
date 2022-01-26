import type { RawMessage } from './raw'

import { TP_MAP } from './raw'

export default class JSONRawMessageReader {
  constructor(private messages: any[] = []){}
  append(messages: any[]) {
    this.messages = this.messages.concat(messages)
  }
  readMessage(): RawMessage | null {
    const msg = this.messages.shift()
    if (!msg) { return null }
    msg.tp = TP_MAP[msg._id]
    delete msg._id
    return msg  as RawMessage
  }

}