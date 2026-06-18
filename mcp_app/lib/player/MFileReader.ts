import { MType } from './raw.gen.js';
import type { RawMessage } from './raw.gen.js';
import RawMessageReader from './RawMessageReader.gen.js';

export default class MFileReader extends RawMessageReader {
  private pLastMessageID: number = 0;
  private currentTime: number = 0;
  public error: boolean = false;
  private noIndexes: boolean = false;

  constructor(
    data: Uint8Array,
    private startTime?: number,
  ) {
    super(data);
  }

  public checkForIndexes() {
    const skipIndexes = this.buf.slice(0, 8).every((b) => b === 0xff);
    if (skipIndexes) {
      if (!this.noIndexes) {
        this.skip(8);
      }
      this.noIndexes = true;
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

  private readRawMessage(): RawMessage | null {
    if (!this.noIndexes) {
      this.skip(8);
    }
    try {
      const msg = super.readMessage();
      if (!msg && !this.noIndexes) {
        this.skip(-8);
      }
      return msg;
    } catch (e) {
      console.error('Read message error:', e);
      this.error = true;
      return null;
    }
  }

  currentTab = 'back-compatability';

  readNext(): (RawMessage & { time: number; tabId: string; _index?: number }) | null {
    if (this.error || !this.hasNextByte()) {
      return null;
    }

    while (!this.noIndexes && this.needSkipMessage()) {
      const skippedMessage = this.readRawMessage();
      if (!skippedMessage) {
        return null;
      }
    }
    this.pLastMessageID = this.noIndexes ? 0 : this.p;

    const rMsg = this.readRawMessage();
    if (!rMsg) {
      return null;
    }

    if (rMsg.tp === MType.TabData) {
      this.currentTab = (rMsg as any).tabId;
      return this.readNext();
    }
    if (rMsg.tp === MType.Timestamp) {
      if (!this.startTime) {
        this.startTime = (rMsg as any).timestamp;
      }
      this.currentTime = (rMsg as any).timestamp - this.startTime;
      return {
        tp: 9999 as any,
        tabId: '',
        time: this.currentTime,
      } as any;
    }

    const index = this.noIndexes ? 0 : this.getLastMessageID();
    // No rewriteMessage on server - that will be done in the UI
    const msg = Object.assign(
      rMsg,
      {
        time: this.currentTime ?? (rMsg as any).timestamp - this.startTime!,
        tabId: this.currentTab,
      },
      !this.noIndexes ? { _index: index } : {},
    );

    return msg as any;
  }
}
