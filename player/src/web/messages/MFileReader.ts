import Logger from '../../logger';
import type { Message } from './message.gen';
import type { RawMessage } from './raw.gen';
import { MType, VALID_TP_SET } from './raw.gen';
import RawMessageReader from './RawMessageReader.gen';
import { headerVersion } from './protoFormat';
import rewriteMessage from './rewriter/rewriteMessage';

const INDEX_SIZE = 8;

// TODO: composition instead of inheritance
// needSkipMessage() and next() methods here use buf and p protected properties,
export default class MFileReader extends RawMessageReader {
  /** Index of the last message read; later messages with a lower index are duplicates */
  private lastIndex: number = -1;

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

  /** An unreadable message only loses the rest of its file: files start on a message boundary. */
  append(buf: Uint8Array): void {
    if (this.error) {
      this.p = this.buf.length;
      this.error = false;
    }
    super.append(buf);
  }

  public checkForIndexes() {
    // 8-byte header (0xff x7 + version byte) — skip it
    if (!this.headerSkipped && headerVersion(this.buf, this.p)) {
      this.skip(8);
      this.headerSkipped = true;
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
          // Small sequential index (1, 2, ...) vs message content:
          // If the 8-byte value is small AND byte[p+8] is a valid tp, likely has indexes
          const id = this.readIndexAt(this.p);
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

  private readIndexAt(pos: number): number {
    let id = 0;
    for (let i = 0; i < INDEX_SIZE; i++) {
      id += this.buf[pos + i] * 2 ** (8 * i);
    }
    return id;
  }

  private hasIndexAt(pos: number): boolean {
    return pos + INDEX_SIZE <= this.buf.length;
  }

  private needSkipMessage(): boolean {
    if (this.lastIndex < 0 || !this.hasIndexAt(this.p)) return false;
    return this.readIndexAt(this.p) < this.lastIndex;
  }

  /**
   * Reads the messages from byteArray, returns null if read ended
   * will reset to last correct pointer if encountered bad read
   * (i.e mobfile was split in two parts and it encountered partial message)
   * then will proceed to read next message when next mobfile part will be added
   * via super.append
   * */
  private readRawMessage(): RawMessage | null {
    const start = this.p;
    try {
      if (!this.noIndexes) {
        if (!this.hasIndexAt(this.p)) return null;
        this.skip(INDEX_SIZE);
      }
      const msg = super.readMessage();
      if (msg === null) {
        // keep the index too, so the message is re-read whole after append()
        this.p = start;
      }
      return msg;
    } catch (e) {
      this.logger.error('Read message error:', e);
      this.error = true;
      return null;
    }
  }

  currentTab = 'back-compatability';

  readNext(): (Message & { tabId: string; _index?: number }) | null {
    for (;;) {
      if (this.error || !this.hasNextByte()) {
        return null;
      }

      let skipped = 0;
      while (!this.noIndexes && this.needSkipMessage()) {
        if (!this.readRawMessage()) {
          return null;
        }
        skipped++;
      }
      if (skipped > 0) {
        Logger.log(`Openreplay: skipped ${skipped} out-of-order messages`);
      }

      const index =
        this.noIndexes || !this.hasIndexAt(this.p) ? 0 : this.readIndexAt(this.p);
      const rMsg = this.readRawMessage();
      if (!rMsg) {
        return null;
      }
      if (!this.noIndexes) {
        this.lastIndex = index;
      }

      if (rMsg.tp === MType.TabData) {
        this.currentTab = rMsg.tabId;
        continue;
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
        } as unknown as Message & { tabId: string };
      }

      const msg = rewriteMessage(rMsg) as Message & {
        tabId: string;
        _index?: number;
      };
      // mobile streams have no Timestamp messages; MobFileParser times them from msg.timestamp
      msg.time = this.currentTime;
      msg.tabId = this.currentTab;
      if (!this.noIndexes) {
        msg._index = index;
      }
      return msg;
    }
  }
}
