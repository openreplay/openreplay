import unpack from '../../common/unpack';
import type { PlayerMsg } from '../../common/types';
import { fixMessageOrder } from './messageOrder';
import MFileReader from './MFileReader';
import TrackerReader from './TrackerReader';
import { MType } from './raw.gen';
import { detectProtoFormat, stripHeader } from './protoFormat';

export interface MobFileParserOptions {
  /** Breaks ties when the first file has no format header */
  trackerVersion?: string;
  /** Mobile recordings are always v1 whatever their header says, and every message carries an absolute timestamp */
  mobile?: boolean;
}

function normalizeReduxTime(msg: PlayerMsg, startTime: number) {
  const m = msg as PlayerMsg & { actionTime?: number };
  if (m.actionTime) {
    m.time = m.actionTime - startTime;
  } else {
    m.actionTime = m.time + startTime;
  }
}

/**
 * Turns a session's consecutive files (dom.mobs, dom.mobe, ...) into ordered player messages.
 * Format is detected from the first file; reader state carries over between files.
 * Shared by MessageLoader and the MCP app.
 */
export default class MobFileParser {
  private mfileReader: MFileReader | null = null;
  private trackerReader: TrackerReader | null = null;

  constructor(
    private readonly startTime: number,
    private readonly options: MobFileParserOptions = {},
  ) {}

  /** The v1 stream hit an unreadable message; nothing after it can be parsed. */
  get readError(): boolean {
    return !!this.mfileReader?.error;
  }

  feed(rawBytes: Uint8Array): PlayerMsg[] {
    return this.parse(unpack(rawBytes));
  }

  /** Same as feed() for data that is already decompressed. */
  parse(data: Uint8Array): PlayerMsg[] {
    if (!this.mfileReader && !this.trackerReader) {
      const version = this.options.mobile
        ? 1
        : detectProtoFormat(data, this.options.trackerVersion);
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
    for (const msg of messages) {
      if (msg.tp === MType.Redux || msg.tp === MType.ReduxDeprecated) {
        normalizeReduxTime(msg, this.startTime);
      }
    }
    return fixMessageOrder(messages);
  }

  private parseV1(data: Uint8Array): PlayerMsg[] {
    const reader = this.mfileReader!;
    reader.append(data);
    reader.checkForIndexes();

    const msgs: PlayerMsg[] = [];
    for (let m = reader.readNext(); m; m = reader.readNext()) {
      msgs.push(m as unknown as PlayerMsg);
    }
    reader.releaseConsumed();

    if (this.options.mobile) {
      for (const msg of msgs) {
        const ts = (msg as { timestamp?: unknown }).timestamp;
        if (typeof ts === 'number') msg.time = ts - this.startTime;
      }
      return fixMessageOrder(msgs);
    }

    let artificialStartTime = Infinity;
    for (const msg of msgs) {
      if (msg.tp === MType.Redux || msg.tp === MType.ReduxDeprecated) {
        normalizeReduxTime(msg, this.startTime);
      }
      if (msg.tp === MType.CreateDocument && msg.time < artificialStartTime) {
        artificialStartTime = msg.time;
      }
    }
    if (artificialStartTime === Infinity) artificialStartTime = 0;

    // Anything without a time is moved to the first document creation so it isn't applied before it
    if (artificialStartTime !== 0) {
      let broken = 0;
      for (const msg of msgs) {
        if (!msg.time) {
          msg.time = artificialStartTime;
          broken++;
        }
      }
      if (broken > 0) console.warn('Broken timestamp messages', broken);
    }

    return fixMessageOrder(msgs);
  }
}
