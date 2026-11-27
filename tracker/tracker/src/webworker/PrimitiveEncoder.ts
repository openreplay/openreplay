declare const TextEncoder: any
const textEncoder: {
  encode(str: string): Uint8Array
  encodeInto?(str: string, dest: Uint8Array): { read: number; written: number }
} =
  typeof TextEncoder === 'function'
    ? new TextEncoder()
    : {
        // Based on https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
        encode(str): Uint8Array {
          const Len = str.length,
            resArr = new Uint8Array(Len * 3)
          let resPos = -1
          for (let point = 0, nextcode = 0, i = 0; i !== Len; ) {
            ;(point = str.charCodeAt(i)), (i += 1)
            if (point >= 0xd800 && point <= 0xdbff) {
              if (i === Len) {
                resArr[(resPos += 1)] = 0xef /*0b11101111*/
                resArr[(resPos += 1)] = 0xbf /*0b10111111*/
                resArr[(resPos += 1)] = 0xbd /*0b10111101*/
                break
              }
              // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
              nextcode = str.charCodeAt(i)
              if (nextcode >= 0xdc00 && nextcode <= 0xdfff) {
                point = (point - 0xd800) * 0x400 + nextcode - 0xdc00 + 0x10000
                i += 1
                if (point > 0xffff) {
                  resArr[(resPos += 1)] = (0x1e /*0b11110*/ << 3) | (point >>> 18)
                  resArr[(resPos += 1)] =
                    (0x2 /*0b10*/ << 6) | ((point >>> 12) & 0x3f) /*0b00111111*/
                  resArr[(resPos += 1)] =
                    (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f) /*0b00111111*/
                  resArr[(resPos += 1)] = (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/
                  continue
                }
              } else {
                resArr[(resPos += 1)] = 0xef /*0b11101111*/
                resArr[(resPos += 1)] = 0xbf /*0b10111111*/
                resArr[(resPos += 1)] = 0xbd /*0b10111101*/
                continue
              }
            } else if (point >= 0xdc00 && point <= 0xdfff) {
              point = 0xfffd // lone low surrogate
            }
            if (point <= 0x007f) {
              resArr[(resPos += 1)] = (0x0 /*0b0*/ << 7) | point
            } else if (point <= 0x07ff) {
              resArr[(resPos += 1)] = (0x6 /*0b110*/ << 5) | (point >>> 6)
              resArr[(resPos += 1)] = (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/
            } else {
              resArr[(resPos += 1)] = (0xe /*0b1110*/ << 4) | (point >>> 12)
              resArr[(resPos += 1)] = (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f) /*0b00111111*/
              resArr[(resPos += 1)] = (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/
            }
          }
          return resArr.subarray(0, resPos + 1)
        },
      }

const varintSize = (n: number) => (n < 0x80 ? 1 : n < 0x4000 ? 2 : n < 0x200000 ? 3 : 4)

export default class PrimitiveEncoder {
  private offset = 0
  private checkpointOffset = 0
  private readonly data: Uint8Array
  constructor(private readonly size: number) {
    this.data = new Uint8Array(size)
  }
  getCurrentOffset(): number {
    return this.offset
  }
  getCurrentCheckpoint(): number {
    return this.checkpointOffset
  }
  checkpoint() {
    this.checkpointOffset = this.offset
  }
  get isEmpty(): boolean {
    return this.offset === 0
  }
  skip(n: number): boolean {
    this.offset += n
    return this.offset <= this.size
  }
  set(bytes: Uint8Array, offset: number) {
    this.data.set(bytes, offset)
  }
  setByte(offset: number, value: number) {
    this.data[offset] = value
  }
  boolean(value: boolean): boolean {
    this.data[this.offset++] = +value
    return this.offset <= this.size
  }
  uint(value: number): boolean {
    if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
      value = 0
    }
    const d = this.data
    let o = this.offset
    if (value < 0x80000000) {
      value = value >>> 0
      while (value >= 0x80) {
        d[o++] = (value & 0x7f) | 0x80
        value >>>= 7
      }
    } else {
      while (value >= 0x80) {
        d[o++] = value % 0x100 | 0x80
        value = Math.floor(value / 128)
      }
    }
    d[o++] = value
    this.offset = o
    return o <= this.size
  }
  int(value: number): boolean {
    value = Math.round(value)
    return this.uint(value >= 0 ? value * 2 : value * -2 - 1)
  }
  string(value: string): boolean {
    // TextEncoder.encode() coercion: undefined is '', anything else goes through String()
    if (typeof value !== 'string') value = value === undefined ? '' : String(value)
    const n = value.length
    const d = this.data
    const base = this.offset
    if (n < 0x80 && base + 1 + n <= this.size) {
      let i = 0
      for (; i < n; i++) {
        const c = value.charCodeAt(i)
        if (c > 0x7f) break
        d[base + 1 + i] = c
      }
      if (i === n) {
        d[base] = n
        this.offset = base + 1 + n
        return true
      }
    }
    if (!textEncoder.encodeInto) return this.encodedString(value)
    // Encode right after the widest length prefix it could need, then close the
    // gap once the real byte length is known.
    const prefix = varintSize(n * 3)
    const start = base + prefix
    if (start > this.size) return this.encodedString(value)
    const { read, written } = textEncoder.encodeInto(value, d.subarray(start))
    // Out of room, though it may still fit behind a shorter prefix
    if (read < n) return this.encodedString(value)
    const realPrefix = varintSize(written)
    if (realPrefix < prefix) d.copyWithin(base + realPrefix, start, start + written)
    this.uint(written)
    this.offset = base + realPrefix + written
    return this.offset <= this.size
  }
  private encodedString(value: string): boolean {
    const encoded = textEncoder.encode(value)
    const length = encoded.byteLength
    if (!this.uint(length) || this.offset + length > this.size) {
      return false
    }
    this.data.set(encoded, this.offset)
    this.offset += length
    return true
  }
  reset(): void {
    this.offset = 0
    this.checkpointOffset = 0
  }
  /** Roll back offset and checkpoint atomically. Used to undo a partial write
   *  on overflow. Caller must pass values it captured BEFORE the write attempt;
   *  silently ignores attempts to advance forward. */
  rewind(offset: number, checkpointOffset: number): void {
    if (offset > this.offset || checkpointOffset > this.checkpointOffset) {
      return
    }
    this.offset = offset
    this.checkpointOffset = checkpointOffset
  }
  flush(): Uint8Array {
    const data = this.data.slice(0, this.checkpointOffset)
    this.reset()
    return data
  }
}
