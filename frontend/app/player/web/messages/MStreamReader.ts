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

  currentTab = 'back-compatability'
  readNext(): Message & { _index: number, tabId: string } | null {
    let msg = this.r.readMessage()
    if (msg === null) { return null }
    if (msg.tp === MType.Timestamp) {
      this.startTs = this.startTs || msg.timestamp
      const newT = msg.timestamp - this.startTs
      if (newT > this.t) {
        this.t = newT
      }
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
