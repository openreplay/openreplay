import Logger from 'App/logger';
import type { Message } from './message.gen';
import type { RawMessage } from './raw.gen';
import { MType, VALID_TP_SET } from './raw.gen';
import RawMessageReader from './RawMessageReader.gen';
import rewriteMessage from './rewriter/rewriteMessage';

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties,
export default class MFileReader extends RawMessageReader {
  private pLastMessageID: number = 0;

  private currentTime: number = 0;

  public error: boolean = false;

  private noIndexes: boolean = false;
  private headerSkipped: boolean = false;
  private indexesDetected: boolean = false;

  constructor(
    data: Uint8Array,
    private startTime?: number,
    private logger = console,
  ) {
    super(data);
  }

  public checkForIndexes() {
    // 8-byte header (0xff x7 + version byte) — skip it
    const hasHeader =
      this.buf.length >= 8 &&
      this.buf.slice(this.p, this.p + 7).every((b) => b === 0xff) &&
      (this.buf[this.p + 7] === 0xff ||
        this.buf[this.p + 7] === 0xfe ||
        this.buf[this.p + 7] === 0xfd);

    if (hasHeader && !this.headerSkipped) {
      this.skip(8);
      this.headerSkipped = true;
      // Set pLastMessageID past the header so needSkipMessage
      // doesn't compare real indexes against the 0xFF header bytes
      this.pLastMessageID = this.p;
    }

    // After header, detect if data has 8-byte LE indexes before each message.
    // If the byte at current position is NOT a valid message type, it's an index.
    if (!this.indexesDetected) {
      this.indexesDetected = true;
      if (this.p + 8 < this.buf.length) {
        const firstByte = this.buf[this.p];
        // Index bytes form a LE uint64; first byte of an index is typically
        // a small number (1, 2, ...) that could also be a valid tp.
        // But byte[8] after the index should also be a valid tp.
        // If firstByte is a valid tp, check if treating it as an index
        // produces a valid tp at position p+8.
        if (!VALID_TP_SET.has(firstByte)) {
          // Not a valid tp → must be an index
          this.noIndexes = false;
        } else {
          // Could be tp or index. Read 8-byte LE value.
          let id = 0;
          for (let i = 0; i < 8; i++) {
            id += this.buf[this.p + i] * 2 ** (8 * i);
          }
          // Small sequential index (1, 2, ...) vs message content:
          // If the 8-byte value is small AND byte[p+8] is a valid tp, likely has indexes
          const byteAfterIndex = this.buf[this.p + 8];
          if (id <= 0xffffffffffff && VALID_TP_SET.has(byteAfterIndex)) {
            this.noIndexes = false;
          } else {
            this.noIndexes = true;
          }
        }
      } else {
        this.noIndexes = true;
      }
    }
  }

  private needSkipMessage(): boolean {
    if (this.p === 0) return false;
    for (let i = 7; i >= 0; i--) {
      if (this.buf[this.p + i] !== this.buf[this.pLastMessageID + i]) {
        return this.buf[this.p + i] < this.buf[this.pLastMessageID + i];
      }
    }
    return false;
  }

  private getLastMessageID(): number {
    let id = 0;
    for (let i = 0; i < 8; i++) {
      id += this.buf[this.p + i] * 2 ** (8 * i);
    }
    return id;
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
        this.skip(8);
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

    while (!this.noIndexes && this.needSkipMessage()) {
      const skippedMessage = this.readRawMessage();
      if (!skippedMessage) {
        return null;
      }
      Logger.group('Openreplay: Skipping messages ', skippedMessage);
    }
    this.pLastMessageID = this.noIndexes ? 0 : this.p;

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

    const index = this.noIndexes ? 0 : this.getLastMessageID();
    const msg = Object.assign(
      rewriteMessage(rMsg),
      {
        // @ts-ignore
        time: this.currentTime ?? rMsg.timestamp - this.startTime!,
        tabId: this.currentTab,
      },
      !this.noIndexes ? { _index: index } : {},
    );

    return msg;
  }
}
