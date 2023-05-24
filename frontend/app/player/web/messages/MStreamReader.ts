import type { Message } from './message.gen'
import type { RawMessage } from './raw.gen'
import { MType } from './raw.gen'

interface RawMessageReaderI {
  readMessage(): RawMessage | null
}

export default class MStreamReader {
  constructor(private readonly r: RawMessageReaderI, private startTs: number = 0){}

  private t: number = 0
  private idx: number = 0

  currentTab = ''
  readNext(): Message & { _index: number } | null {
    let msg = this.r.readMessage()
    if (msg === null) { return null }
    if (msg.tp === MType.Timestamp) {
      this.startTs = this.startTs || msg.timestamp
      this.t = msg.timestamp - this.startTs
      return this.readNext()
    }
    if (msg.tp === MType.TabData) {
      this.currentTab = msg.tabId
      return this.readNext()
    }

    return Object.assign(msg, {
      time: this.t,
      _index: this.idx++,
      tabId: this.currentTab,
    })
  }
}
