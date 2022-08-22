import type { Message } from './message';
import type { RawMessage } from './raw';
import logger from 'App/logger';
import RawMessageReader from './RawMessageReader';

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties, 
// which should be probably somehow incapsulated
export default class MFileReader extends RawMessageReader {
  private pLastMessageID: number = 0
  private currentTime: number
  public error: boolean = false
  constructor(data: Uint8Array, private startTime?: number) {
    super(data)
  }

  private needSkipMessage(): boolean {
    if (this.p === 0) return false
    for (let i = 7; i >= 0; i--) {
      if (this.buf[ this.p + i ] !== this.buf[ this.pLastMessageID + i ]) {
        return this.buf[ this.p + i ] - this.buf[ this.pLastMessageID + i ] < 0
      }
    }
    return false
  }

  private readRawMessage(): RawMessage | null {
    this.skip(8)
    try {
      const msg = super.readMessage()
      if (!msg) {
        this.skip(-8)
      }
      return msg
    } catch (e) {
      this.error = true
      logger.error("Read message error:", e)
      return null
    }
  }

  next(): [ Message, number] | null {
    if (this.error || !this.hasNextByte()) {
      return null
    }

    while (this.needSkipMessage()) {
      const skippedMessage = this.readRawMessage()
      if (!skippedMessage) {
        return null
      }
      logger.log("Skipping message: ", skippedMessage)
    }

    this.pLastMessageID = this.p

    const rMsg = this.readRawMessage()
    if (!rMsg) {
      return null
    }

    if (rMsg.tp === "timestamp") {
      if (!this.startTime) {
        this.startTime = rMsg.timestamp
      }
      this.currentTime = rMsg.timestamp - this.startTime
      return this.next()
    } 

    const msg = Object.assign(rMsg, {
      time: this.currentTime,
      _index: this.pLastMessageID,
    })

    return [msg, this.pLastMessageID]
  }
}
