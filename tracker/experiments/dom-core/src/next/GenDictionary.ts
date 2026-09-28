/**
 * Drop-in for StringDictionary: approximate LRU with two generations instead of
 * Map delete+set on every hit (which forces V8 OrderedHashMap compactions).
 * A hit in `young` is free; a hit in `old` promotes the entry. When `young` fills
 * up, `old` (entries unused for a whole generation) is dropped wholesale.
 */
const MAX_ENTRIES = 100_000
const MAX_CHARS = 20_000_000
const SUFFIX_SPACE = 10_000

export class GenDictionary {
  private young = new Map<string, number>()
  private old = new Map<string, number>()
  private youngChars = 0
  private lastTs = -1
  private lastSuffix = 0

  constructor(
    private readonly maxEntries = MAX_ENTRIES,
    private readonly maxChars = MAX_CHARS,
  ) {}

  getKey = (str: string): [number, boolean] => {
    const y = this.young.get(str)
    if (y !== undefined) return [y, false]
    const o = this.old.get(str)
    if (o !== undefined) {
      this.old.delete(str)
      this.put(str, o)
      return [o, false]
    }
    const id = this.nextKey()
    this.put(str, id)
    return [id, true]
  }

  private put(str: string, id: number) {
    this.young.set(str, id)
    this.youngChars += str.length
    if (this.young.size > this.maxEntries / 2 || this.youngChars > this.maxChars / 2) {
      this.old = this.young
      this.young = new Map()
      this.youngChars = 0
    }
  }

  private nextKey() {
    const shavedTs = Date.now() % 10 ** (13 - 2)
    if (shavedTs > this.lastTs) {
      this.lastTs = shavedTs
      this.lastSuffix = 0
    } else if (this.lastSuffix < SUFFIX_SPACE - 1) {
      this.lastSuffix += 1
    } else {
      this.lastTs += 1
      this.lastSuffix = 0
    }
    return this.lastTs * SUFFIX_SPACE + this.lastSuffix
  }

  clear() {
    this.young.clear()
    this.old.clear()
    this.youngChars = 0
  }
}
