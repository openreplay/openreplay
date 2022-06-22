import type Message from "../common/messages.js";
import PrimitiveWriter from "./PrimitiveWriter.js";
import { 
  BatchMeta,
  Timestamp,
} from "../common/messages.js";

export default class BatchWriter {
  private nextIndex = 0
  private beaconSize = 2 * 1e5 // Default 200kB
  private writer = new PrimitiveWriter(this.beaconSize)
  private isEmpty = true

  constructor(
    private readonly pageNo: number, 
    private timestamp: number,
    private onBatch: (batch: Uint8Array) => void
  ) {
    this.prepare()
  }

  private prepare(): void {
    if (!this.writer.isEmpty()) {
      return
    }
    new BatchMeta(this.pageNo, this.nextIndex, this.timestamp).encode(this.writer)
  }

  private write(message: Message): boolean {
    const wasWritten = message.encode(this.writer)
    if (wasWritten) {
      this.isEmpty = false
      this.writer.checkpoint()
      this.nextIndex++
    }
    return wasWritten
  }

  private beaconSizeLimit = 1e6
  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit
  }

  writeMessage(message: Message) {
    if (message instanceof Timestamp) {
      this.timestamp = (<any>message).timestamp
    }
    while (!this.write(message)) {
      this.finaliseBatch()
      if (this.beaconSize === this.beaconSizeLimit) {
        console.warn("OpenReplay: beacon size overflow. Skipping large message.");
        this.writer.reset()
        this.prepare()
        this.isEmpty = true
        return
      }
      // MBTODO: tempWriter for one message?
      this.beaconSize = Math.min(this.beaconSize*2, this.beaconSizeLimit)
      this.writer = new PrimitiveWriter(this.beaconSize)
      this.prepare()
      this.isEmpty = true
    }
  }

  finaliseBatch() {
    if (this.isEmpty) { return }
    this.onBatch(this.writer.flush())
    this.prepare()
    this.isEmpty = true
  }

  clean() {
    this.writer.reset()
  }

}
