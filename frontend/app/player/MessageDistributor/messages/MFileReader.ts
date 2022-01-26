import type { Message } from './message';
import type { RawMessage } from './raw';
import logger from 'App/logger';
import RawMessageReader from './RawMessageReader';

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties, 
// which should be probably somehow incapsulated
export default class MFileReader extends RawMessageReader {
  private pLastMessageID: number = 0;
  private currentTime: number = 0;
  public error: boolean = false;
  constructor(data: Uint8Array, private readonly startTime: number) {
    super(data);
  }

  private needSkipMessage(): boolean {
    if (this.p === 0) return false;
    for (let i = 7; i >= 0; i--) {
      if (this.buf[ this.p + i ] !== this.buf[ this.pLastMessageID + i ]) {
        return this.buf[ this.p + i ] - this.buf[ this.pLastMessageID + i ] < 0;
      }
    }
    return true;
  }

  private readRawMessage(): RawMessage | null {
    this.skip(8);
    try {
      return super.readMessage();
    } catch (e) {
      this.error = true;
      logger.error("Read message error:", e);
      return null;
    }
  }

  hasNext():boolean {
    return !this.error && this.hasNextByte();
  }

  next(): [ Message, number] | null {
    if (!this.hasNext()) {
      return null;
    }

    while (this.needSkipMessage()) {
      this.readRawMessage();
    }
    this.pLastMessageID = this.p;

    const rMsg = this.readRawMessage();
    if (!rMsg) {
      return null;
    }

    if (rMsg.tp === "timestamp") {
      this.currentTime = rMsg.timestamp - this.startTime;
    } else {
      const msg = Object.assign(rMsg, {
        time: this.currentTime,
        _index: this.pLastMessageID,
      })
      return [msg, this.pLastMessageID];
    }
    return null;
  }
}