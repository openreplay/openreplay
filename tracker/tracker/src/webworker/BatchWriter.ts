import Writer from "../messages/writer.js";
import Message from "../messages/message.js";
import { 
  BatchMeta,
  Timestamp,
} from "../messages/index.js";

export default class BatchWriter {
  private nextIndex = 0
  private beaconSize = 2 * 1e5 // Default 200kB
  private writer = new Writer(this.beaconSize)
  private isEmpty = true

  constructor(
    private readonly pageNo: number, 
    private timestamp: number,
    private onBatch: (batch: Uint8Array) => void
  ) {
    this.prepareBatchMeta()
  }

  private prepareBatchMeta(): boolean {
    return new BatchMeta(this.pageNo, this.nextIndex, this.timestamp).encode(this.writer)
  }

  private beaconSizeLimit = 1e6
  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit
  }

  // TODO: clear workflow
  writeMessage(message: Message) {
    if (message instanceof Timestamp) {
      this.timestamp = (<any>message).timestamp
    }

    if (!message.encode(this.writer)) {
      if (!this.isEmpty) {
        this.onBatch(this.writer.flush())
        this.prepareBatchMeta()
      }

      while (!message.encode(this.writer)) { 
        if (this.beaconSize === this.beaconSizeLimit) {
          console.warn("OpenReplay: beacon size overflow. Skipping large message.");
          this.writer.reset()
          this.prepareBatchMeta()
          this.isEmpty = true
          return
        }
        // MBTODO: tempWriter for one message?
        this.beaconSize = Math.min(this.beaconSize*2, this.beaconSizeLimit)
        this.writer = new Writer(this.beaconSize)
        this.prepareBatchMeta()
      }
    }
    this.writer.checkpoint()
    this.nextIndex++
    this.isEmpty = false
  }

  finaliseBatch() {
    if (this.isEmpty) { return }
    this.onBatch(this.writer.flush())
    this.prepareBatchMeta()
    this.isEmpty = true
  }

  clean() {
    this.writer.reset()
  }

}