import type Message from '../common/messages.js';
import * as Messages from '../common/messages.js';
import MessageEncoder from './MessageEncoder.js';
import PrimitiveEncoder from './PrimitiveEncoder.js';

const SIZE_RESERVED = 2;
const MAX_M_SIZE = (1 << (SIZE_RESERVED * 8)) - 1;

export default class BatchWriter {
  private nextIndex = 0;
  private beaconSize = 2 * 1e5; // Default 200kB
  private encoder = new MessageEncoder(this.beaconSize);
  private readonly sizeEncoder = new PrimitiveEncoder(SIZE_RESERVED);
  private isEmpty = true;

  constructor(
    private readonly pageNo: number,
    private timestamp: number,
    private url: string,
    private readonly onBatch: (batch: Uint8Array) => void,
  ) {
    this.prepare();
  }

  private prepare(): void {
    if (!this.encoder.isEmpty()) {
      return;
    }
    // MBTODO: move service-messages creation to webworker
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      1,
      this.pageNo,
      this.nextIndex,
      this.timestamp,
      this.url,
    ];
    this.encoder.encode(batchMetadata);
  }

  private write(message: Message): boolean {
    const e = this.encoder;
    if (!e.uint(message[0]) || !e.skip(SIZE_RESERVED)) {
      return false;
    }
    const startOffset = e.getCurrentOffset();
    const wasWritten = e.encode(message);
    if (wasWritten) {
      const endOffset = e.getCurrentOffset();
      const size = endOffset - startOffset;
      if (size > MAX_M_SIZE || !this.sizeEncoder.uint(size)) {
        console.warn('OpenReplay: max message size overflow.');
        return false;
      }
      this.sizeEncoder.checkpoint(); // TODO: separate checkpoint logic to an Encoder-inherit class
      e.set(this.sizeEncoder.flush(), startOffset - SIZE_RESERVED);

      e.checkpoint();
      this.isEmpty = false;
      this.nextIndex++;
    }
    return wasWritten;
  }

  private beaconSizeLimit = 1e6;
  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit;
  }

  writeMessage(message: Message) {
    if (message[0] === Messages.Type.Timestamp) {
      this.timestamp = message[1]; // .timestamp
    }
    if (message[0] === Messages.Type.SetPageLocation) {
      this.url = message[1]; // .url
    }
    while (!this.write(message)) {
      this.finaliseBatch();
      if (this.beaconSize === this.beaconSizeLimit) {
        console.warn('OpenReplay: beacon size overflow. Skipping large message.');
        this.encoder.reset();
        this.prepare();
        this.isEmpty = true;
        return;
      }
      // MBTODO: tempWriter for one message?
      this.beaconSize = Math.min(this.beaconSize * 2, this.beaconSizeLimit);
      this.encoder = new MessageEncoder(this.beaconSize);
      this.prepare();
      this.isEmpty = true;
    }
  }

  finaliseBatch() {
    if (this.isEmpty) {
      return;
    }
    this.onBatch(this.encoder.flush());
    this.prepare();
    this.isEmpty = true;
  }

  clean() {
    this.encoder.reset();
  }
}
