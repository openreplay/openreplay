import RawMessageReader from './RawMessageReader.gen';
import type { Message } from './message.gen';
import type { RawMessage } from './raw.gen';
import { MType, VALID_TP_SET } from './raw.gen';
import rewriteMessage from './rewriter/rewriteMessage';

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties,
export default class MFileReader extends RawMessageReader {
  private currentTime: number = 0;

  public error: boolean = false;

  public lastIndex: number = 0;

  private hasIndexes: boolean | null = null;

  constructor(
    data: Uint8Array,
    private startTime?: number,
    private noIndexes = false,
    private logger = console,
  ) {
    super(data);
  }

  /**
   * Detect once whether the data has 8-byte LE indexes before each message.
   * Check: if buf[0] is NOT a valid tp but buf[8] IS, we have indexes.
   * If buf[0] IS a valid tp, no indexes.
   */
  private detectIndexes(): boolean {
    if (this.buf.length < 9) return false;
    const firstByte = this.buf[this.p];
    const byteAfterIndex = this.buf[this.p + 8];
    // If current byte is not a valid tp, the data must start with an index
    if (!VALID_TP_SET.has(firstByte)) return true;
    // If current byte IS a valid tp but byte[8] is also valid,
    // disambiguate: a real index would be a large LE uint64 (> MAX_KNOWN_TP)
    if (VALID_TP_SET.has(byteAfterIndex)) {
      let id = 0;
      for (let i = 0; i < 8; i++) {
        id += this.buf[this.p + i] * 2 ** (8 * i);
      }
      // Real indexes are large (typically > 2^32); a small value means
      // buf[0] is the tp and the "index" was just message payload
      return id > 123;
    }
    return false;
  }

  private readIndex(): boolean {
    if (this.p + 8 > this.buf.length) return false;
    let id = 0;
    for (let i = 0; i < 8; i++) {
      id += this.buf[this.p + i] * 2 ** (8 * i);
    }
    this.lastIndex = id;
    this.p += 8;
    return true;
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
      if (!this.noIndexes) {
        if (this.hasIndexes === null) {
          this.hasIndexes = this.detectIndexes();
        }
        if (this.hasIndexes && !this.readIndex()) return null;
      }
      return super.readMessage();
    } catch (e) {
      this.logger.error('Read message error:', e);
      this.error = true;
      return null;
    }
  }

  currentTab = 'back-compatability';

  readNext(): (Message & { tabId: string; _index?: number }) | null {
    if (this.error || !this.hasNextByte()) {
      return null;
    }

    const rMsg = this.readRawMessage();
    if (!rMsg) {
      return null;
    }

    if (rMsg.tp === MType.TabData) {
      this.currentTab = rMsg.tabId;
      return this.readNext();
    }
    if (rMsg.tp === MType.Timestamp) {
      if (!this.startTime) {
        this.startTime = rMsg.timestamp;
      }
      this.currentTime = rMsg.timestamp - this.startTime;
      return {
        tp: 9999,
        tabId: '',
        time: this.currentTime,
      };
    }

    const msg = Object.assign(
      rewriteMessage(rMsg),
      {
        // @ts-ignore
        time: this.currentTime ?? rMsg.timestamp - this.startTime!,
        tabId: this.currentTab,
      },
      { _index: this.lastIndex },
    );

    return msg;
  }
}
