import RawMessageReader from './RawMessageReader.gen';
import type { Message } from './message.gen';
import type { RawMessage } from './raw.gen';
import { MType, MAX_KNOWN_TP } from './raw.gen';
import rewriteMessage from './rewriter/rewriteMessage';

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties,
export default class MFileReader extends RawMessageReader {
  private currentTime: number = 0;

  public error: boolean = false;

  public lastIndex: number = 0;

  constructor(
    data: Uint8Array,
    private startTime?: number,
    private noIndexes = false,
    private logger = console,
  ) {
    super(data);
  }

  /**
   * Try to detect and consume an 8-byte LE index before the next message.
   * Peek ahead: if skipping 8 bytes lands on a valid message type byte,
   * those 8 bytes are an index. Otherwise, no index is present.
   */
  private tryReadIndex(): boolean {
    if (this.p + 9 > this.buf.length) return false;
    const tpAfterIndex = this.buf[this.p + 8];
    if (tpAfterIndex <= MAX_KNOWN_TP) {
      let id = 0;
      for (let i = 0; i < 8; i++) {
        id += this.buf[this.p + i] * 2 ** (8 * i);
      }
      this.lastIndex = id;
      this.p += 8;
    } else {
      this.lastIndex++;
    }
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
      if (!this.noIndexes && !this.tryReadIndex()) return null;
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
