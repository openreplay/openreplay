import type { PlayerMsg } from 'Player';

import TrackerBinaryReader from './TrackerBinaryReader.gen';
import { MType } from './raw.gen';
import rewriteMessage from './rewriter/rewriteMessage';

export type BatchKind = 'player' | 'assets' | 'devtools' | 'analytics';
type TsPlaceholder = { tp: 9999; time: number };

export default class TrackerReader {
  private currentTime = 0;
  private currentTab = '';
  private reader = new TrackerBinaryReader();

  constructor(private startTime: number) {}

  append = (data: Uint8Array) => {
    this.reader.append(data);
  };

  /**
   * Append new data and parse all complete messages available so far.
   * Returns { kind, messages } — 'player' (version=2) or 'assets' (version=3).
   */
  readBatch(): Array<PlayerMsg | TsPlaceholder> {
    const messages: Array<PlayerMsg | TsPlaceholder> = [];

    while (this.reader.hasNextByte()) {
      const raw = this.reader.readMessage();
      if (!raw) {
        break;
      }

      if (raw.tp === MType.Timestamp) {
        const ts = (raw as { tp: number; timestamp: number }).timestamp;
        this.currentTime = ts - this.startTime;
        messages.push({
          tp: 9999,
          time: this.currentTime,
        });
        continue;
      }

      if (raw.tp === MType.TabData) {
        this.currentTab = (raw as { tp: number; tabId: string }).tabId;
        continue;
      }

      const msg = Object.assign(rewriteMessage(raw), {
        time: this.currentTime,
        tabId: this.currentTab,
      }) as PlayerMsg;

      messages.push(msg);
    }
    if (this.reader.hasReadAll()) {
      console.log(
        'has read all bytes',
        this.reader.getBufferSize(),
        this.reader.batchMetaMessages,
      );
    }
    return messages;
  }
}
