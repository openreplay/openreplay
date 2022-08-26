import type { Message } from './message'
import type { RawMessage } from './raw'
import RawMessageReader from './RawMessageReader'

interface RawMessageReaderI {
  readMessage(): RawMessage | null
}

export default class MStreamReader {
  constructor(private readonly r: RawMessageReaderI = new RawMessageReader(), private startTs: number = 0){}

  private t: number = 0
  private idx: number = 0
  readNext(): Message | null {
    let msg = this.r.readMessage()
    if (msg === null) { return null }
    if (msg.tp === "timestamp") {
      this.startTs = this.startTs || msg.timestamp
      this.t = msg.timestamp - this.startTs
      return this.readNext()
    }

    return Object.assign(msg, {
      time: this.t,
      _index: this.idx++,
    })
  }
}
