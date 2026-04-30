import unpack from '../../common/unpack';
import type { PlayerMsg } from '../../common/types';
import { fixMessageOrder, sortIframes } from './messageOrder';
import MFileReader from './MFileReader';
import TrackerReader from './TrackerReader';
import { MType } from './raw.gen';

function checkProtoFormat(binary: Uint8Array): 1 | 2 | 3 {
  if (binary.length < 8) return 1;
  for (let i = 0; i < 7; i++) {
    if (binary[i] !== 0xff) return 1;
  }
  if (binary[7] === 0xfe) return 2;
  if (binary[7] === 0xfd) return 3;
  return 1;
}

function stripHeader(data: Uint8Array): Uint8Array {
  if (data.length < 8) return data;
  for (let i = 0; i < 7; i++) {
    if (data[i] !== 0xff) return data;
  }
  const v = data[7];
  if (v === 0xff || v === 0xfe || v === 0xfd) return data.slice(8);
  return data;
}

/**
 * Standalone parser that mirrors MessageLoader.createV1Parser /
 * createV2Parser exactly (minus encryption + message-manager wiring).
 * Used by the MCP app where we need the same parse output without
 * the rest of the player runtime.
 */
export default class MobFileParser {
  private mfileReader: MFileReader | null = null;
  private trackerReader: TrackerReader | null = null;

  constructor(private readonly startTime: number) {}

  feed(rawBytes: Uint8Array): PlayerMsg[] {
    const data = unpack(rawBytes);

    if (!this.mfileReader && !this.trackerReader) {
      const version = checkProtoFormat(data);
      if (version === 2 || version === 3) {
        this.trackerReader = new TrackerReader(this.startTime);
      } else {
        this.mfileReader = new MFileReader(new Uint8Array(0), this.startTime);
      }
    }

    if (this.trackerReader) return this.parseV2V3(data);
    return this.parseV1(data);
  }

  private parseV2V3(data: Uint8Array): PlayerMsg[] {
    const reader = this.trackerReader!;
    reader.append(stripHeader(data));
    const messages = reader.readBatch() as unknown as PlayerMsg[];
    return fixMessageOrder(messages).sort(sortIframes);
  }

  private parseV1(data: Uint8Array): PlayerMsg[] {
    const reader = this.mfileReader!;
    reader.append(data);
    reader.checkForIndexes();

    const msgs: PlayerMsg[] = [];
    let m: PlayerMsg | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = reader.readNext() as unknown as PlayerMsg | null) !== null) {
      msgs.push(m);
    }
    // Reset error so the next batch can still be attempted
    reader.error = false;

    let artificialStartTime = Infinity;
    let startTimeSet = false;
    msgs.forEach((msg: any) => {
      if (msg.tp === MType.Redux || msg.tp === MType.ReduxDeprecated) {
        if ('actionTime' in msg && msg.actionTime) {
          msg.time = msg.actionTime - this.startTime;
        } else {
          msg.actionTime = msg.time + this.startTime;
        }
      }
      if (
        msg.tp === MType.CreateDocument &&
        msg.time !== undefined &&
        msg.time < artificialStartTime
      ) {
        artificialStartTime = msg.time;
        startTimeSet = true;
      }
    });

    if (!startTimeSet) artificialStartTime = 0;

    msgs.forEach((msg: any) => {
      if (!msg.time) msg.time = artificialStartTime;
    });

    return fixMessageOrder(msgs).sort(sortIframes);
  }
}
