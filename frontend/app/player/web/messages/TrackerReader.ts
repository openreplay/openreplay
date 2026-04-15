import type { PlayerMsg } from 'Player';

import TrackerBinaryReader from './TrackerBinaryReader.gen';
import { MType } from './raw.gen';
import rewriteMessage from './rewriter/rewriteMessage';

export type BatchKind = 'player' | 'assets' | 'devtools' | 'analytics';

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
  readBatch(): PlayerMsg[] {
    const messages: PlayerMsg[] = [];

    while (this.reader.hasNextByte()) {
      const raw = this.reader.readMessage();
      if (!raw) break;

      if (raw.tp === MType.Timestamp) {
        const ts = (raw as { tp: number; timestamp: number }).timestamp;
        this.currentTime = ts - this.startTime;
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

    return messages;
  }
}
