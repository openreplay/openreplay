import type { PlayerMsg } from 'Player';
import type { RawMessage } from './raw.gen';
import { MType } from './raw.gen';
import TrackerBinaryReader from './TrackerBinaryReader.gen';
import rewriteMessage from './rewriter/rewriteMessage';

export type BatchKind = 'player' | 'assets';

/**
 * Reads raw tracker batches (as saved by BatchWriter localDebug)
 * and produces PlayerMsg arrays ready for MessageManager.distributeMessage.
 *
 * Each batch file is a complete batch: BatchMetadata header + Timestamp + TabData + messages.
 * TrackerBinaryReader already handles BatchMetadata by skipping it,
 * but we need the version to classify batches, so we peek at it first.
 */
export default class DebugBatchReader {
  private currentTime = 0;
  private currentTab = 'debug';

  constructor(private startTime: number) {}

  /**
   * Parse a single raw batch file into PlayerMsg[].
   * Returns { kind, messages } so the caller knows whether these are
   * player (version=2) or assets (version=3) messages.
   */
  readBatch(
    data: Uint8Array,
  ): { kind: BatchKind; messages: PlayerMsg[] } {
    const reader = new TrackerBinaryReader(data);

    // Peek at version from BatchMetadata before TrackerBinaryReader skips it.
    // BatchMetadata is type 81, encoded as varint. We read the same way PrimitiveReader does.
    const version = this.peekBatchVersion(data);
    const kind: BatchKind = version === 3 ? 'assets' : 'player';

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
    // Skip the type varint (81 = 0x51, fits in one byte)
    let tp = 0;
    let shift = 0;
    while (p < data.length) {
      const b = data[p++];
      tp |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    // tp should be 81 (BatchMetadata). If not, default to version 2.
    if (tp !== 81) return 2;

    // Read version varint
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
