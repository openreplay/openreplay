import {
  SetNodeAttributeDictGlobal,
  SetNodeAttribute,
  Type,
} from '../../common/messages.gen.js'
import App from '../app/index.js'

// Bounds tracker memory on long sessions with ever-changing attribute values.
// Evicted strings get a fresh key and are re-sent if they show up again;
// keys are time-based, so an old key never gets reused for another string.
const MAX_ENTRIES = 100_000
const MAX_CHARS = 20_000_000
const SUFFIX_SPACE = 10_000

export class StringDictionary {
  private lastTs = -1
  private lastSuffix = 0
  /** backwards dictionary of [repeated str:key], in LRU order (oldest first) */
  private backDict: Map<string, number> = new Map()
  private totalChars = 0

  constructor(
    private readonly maxEntries = MAX_ENTRIES,
    private readonly maxChars = MAX_CHARS,
  ) {}

  getKey = (str: string): [number, boolean] => {
    const existing = this.backDict.get(str)
    if (existing !== undefined) {
      this.backDict.delete(str)
      this.backDict.set(str, existing)
      return [existing, false]
    }
    // shaving the first 2 digits of the timestamp (since they are irrelevant for next millennia)
    const shavedTs = Date.now() % 10 ** (13 - 2)
    if (shavedTs > this.lastTs) {
      this.lastTs = shavedTs
      this.lastSuffix = 0
    } else if (this.lastSuffix < SUFFIX_SPACE - 1) {
      this.lastSuffix += 1
    } else {
      // suffix space of this ms is used up (or the clock went back): borrow the next ms
      this.lastTs += 1
      this.lastSuffix = 0
    }
    const id = this.lastTs * SUFFIX_SPACE + this.lastSuffix
    this.backDict.set(str, id)
    this.totalChars += str.length
    this.evict()
    return [id, true]
  }

  /** drops all entries but keeps the key sequence, so keys are never reused */
  clear() {
    this.backDict.clear()
    this.totalChars = 0
  }

  private evict() {
    while (
      this.backDict.size > 1 &&
      (this.backDict.size > this.maxEntries || this.totalChars > this.maxChars)
    ) {
      const oldest = this.backDict.keys().next().value as string
      this.backDict.delete(oldest)
      this.totalChars -= oldest.length
    }
  }
}

export default class AttributeSender {
  private dict: StringDictionary
  private readonly app: App
  private readonly isDictDisabled: boolean
  constructor(options: { app: App; isDictDisabled: boolean }) {
    this.app = options.app
    this.isDictDisabled = options.isDictDisabled
    this.dict = new StringDictionary()
  }

  public sendSetAttribute = (id: number, name: string, value: string) => {
    if (this.isDictDisabled) {
      const msg: SetNodeAttribute = [Type.SetNodeAttribute, id, name, value]
      return this.app.send(msg)
    } else {
      const message: SetNodeAttributeDictGlobal = [
        Type.SetNodeAttributeDictGlobal,
        id,
        this.applyDict(name),
        this.applyDict(value),
      ]
      return this.app.send(message)
    }
  }

  private applyDict(str: string): number {
    const [key, isNew] = this.dict.getKey(str)
    if (isNew) {
      this.app.send([Type.StringDictGlobal, key, str])
    }
    return key
  }

  clear() {
    this.dict.clear()
  }
}
