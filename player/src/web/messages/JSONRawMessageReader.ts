import type { RawMessage } from './raw.gen';
import type { TrackerMessage } from './tracker.gen';
import translate from './tracker.gen';
import { TP_MAP } from './tracker-legacy.gen';
import rewriteMessage from './rewriter/rewriteMessage';

function legacyTranslate(msg: any): RawMessage | null {
  const type = TP_MAP[msg._id as keyof typeof TP_MAP];
  if (!type) {
    // msg._id can be other than keyof TP_MAP, in fact
    return null;
  }
  msg.tp = type;
  delete msg._id;
  return msg as RawMessage;
}

export default class JSONRawMessageReader {
  /** Read position; shift() would copy large snapshot batches on every message */
  private p = 0;

  constructor(private messages: TrackerMessage[] = []) {}

  append(messages: TrackerMessage[]) {
    this.messages =
      this.p >= this.messages.length
        ? messages
        : this.messages.slice(this.p).concat(messages);
    this.p = 0;
  }

  readMessage(): RawMessage | null {
    while (this.p < this.messages.length) {
      const msg = this.messages[this.p++];
      if (!msg) {
        continue;
      }
      const rawMsg = Array.isArray(msg) ? translate(msg) : legacyTranslate(msg);
      if (rawMsg) {
        return rewriteMessage(rawMsg);
      }
    }
    return null;
  }
}
