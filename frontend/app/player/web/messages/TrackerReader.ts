import type { PlayerMsg } from 'Player';
import { MType } from './raw.gen';
import TrackerBinaryReader from './TrackerBinaryReader.gen';
import rewriteMessage from './rewriter/rewriteMessage';

export type BatchKind = 'player' | 'assets' | 'devtools' | 'analytics';

/**
 * Reads raw tracker batches (v2 protocol format) and produces
 * PlayerMsg arrays ready for MessageManager.distributeMessage.
 *
 * Each batch is: BatchMetadata header + Timestamp + TabData + messages.
 * TrackerBinaryReader handles BatchMetadata by skipping it,
 * but we peek at the version first to classify batch kind.
 *
 * Used for both live v2 session files and local debug batches.
 */
export default class TrackerReader {
  private currentTime = 0;
  private currentTab = '';

  constructor(private startTime: number) {}

  /**
   * Parse a single raw batch into PlayerMsg[].
   * Returns { kind, messages } — 'player' (version=2) or 'assets' (version=3).
   */
  readBatch(
    data: Uint8Array,
  ): { kind: BatchKind; messages: PlayerMsg[] } {
    const reader = new TrackerBinaryReader(data);

    const version = this.peekBatchVersion(data);
    const kindMap: Record<number, BatchKind> = { 3: 'assets', 4: 'devtools', 5: 'analytics' };
    const kind: BatchKind = kindMap[version] ?? 'player';

    const messages: PlayerMsg[] = [];

    while (reader.hasNextByte()) {
      const raw = reader.readMessage();
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

    return { kind, messages };
  }

  /**
   * Read batch version from the BatchMetadata header at the start of the buffer.
   * BatchMetadata wire format: varint(81) + varint(version) + ...
   */
  private peekBatchVersion(data: Uint8Array): number {
    let p = 0;
    let tp = 0;
    let shift = 0;
    while (p < data.length) {
      const b = data[p++];
      tp |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    if (tp !== 81) return 2;

    let version = 0;
    shift = 0;
    while (p < data.length) {
      const b = data[p++];
      version |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return version;
  }
}
