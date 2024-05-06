import type { Message } from './message.gen';
import type { RawMessage } from './raw.gen';
import { MType } from './raw.gen';
import RawMessageReader from './RawMessageReader.gen';
import rewriteMessage from './rewriter/rewriteMessage'
import Logger from 'App/logger'

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties,
export default class MFileReader extends RawMessageReader {
  private pLastMessageID: number = 0
  private currentTime: number
  public error: boolean = false
  private noIndexes: boolean = false
  private skipIndexes: boolean = false
  constructor(data: Uint8Array, private startTime?: number, private logger= console) {
    super(data)
  }

  public checkForIndexes() {
    // 0xff 0xff 0xff 0xff 0xff 0xff 0xff 0xff = no indexes + weird fail over (don't ask)
    const skipIndexes = this.readCustomIndex(this.buf.slice(0, 8)) === 72057594037927940
                        || this.readCustomIndex(this.buf.slice(0, 9)) === 72057594037927940

    if (skipIndexes) {
      if (!this.noIndexes) {
        this.skip(8)
      }
      this.noIndexes = true
    }
  }

  public forceSkipIndexes() {
    this.skipIndexes = true
  }

  private needSkipMessage(): boolean {
    if (this.p === 0) return false
    for (let i = 7; i >= 0; i--) {
      if (this.buf[ this.p + i ] !== this.buf[ this.pLastMessageID + i ]) {
        return this.buf[ this.p + i ] < this.buf[ this.pLastMessageID + i ]
      }
    }
    return false
  }

  private getLastMessageID(): number {
    let id = 0
    for (let i = 0; i< 8; i++) {
      id += this.buf[ this.p + i ] * 2**(8*i)
    }
    return id
  }

  /**
   * Reads the messages from byteArray, returns null if read ended
   * will reset to last correct pointer if encountered bad read
   * (i.e mobfile was split in two parts and it encountered partial message)
   * then will proceed to read next message when next mobfile part will be added
   * via super.append
   * */
  private readRawMessage(): RawMessage | null {
    try {
      if (this.skipIndexes) {
        this.skip(8)
      }
      return super.readMessage()
    } catch (e) {
      this.logger.error("Read message error:", e)
      this.error = true
      return null
    }
  }

  currentTab = 'back-compatability'
  readNext(): Message & { tabId: string; _index?: number } | null {
    if (this.error || !this.hasNextByte()) {
      return null
    }

    while (!this.noIndexes && this.needSkipMessage()) {
      const skippedMessage = this.readRawMessage()
      if (!skippedMessage) {
        return null
      }
      Logger.group("Openreplay: Skipping messages ", skippedMessage)
    }
    this.pLastMessageID = this.noIndexes ? 0 : this.p

    const rMsg = this.readRawMessage()
    if (!rMsg) {
      return null
    }

    if (rMsg.tp === MType.TabData) {
      this.currentTab = rMsg.tabId
      return this.readNext()
    }
    if (rMsg.tp === MType.Timestamp) {
      if (!this.startTime) {
        this.startTime = rMsg.timestamp
      }
      this.currentTime = rMsg.timestamp - this.startTime
      return {
        tp: 9999,
        tabId: '',
        time: this.currentTime,
      }
    }

    const index = this.noIndexes ? 0 : this.getLastMessageID()
    const msg = Object.assign(rewriteMessage(rMsg), {
      // @ts-ignore
      time: this.currentTime ?? rMsg.timestamp - this.startTime!,
      tabId: this.currentTab,
    }, !this.noIndexes ? { _index: index } : {})

    return msg
  }
}
