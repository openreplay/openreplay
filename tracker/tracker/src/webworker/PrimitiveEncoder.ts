declare const TextEncoder: any
const textEncoder: { encode(str: string): Uint8Array } =
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
  checkpoint() {
    this.checkpointOffset = this.offset
  }
  isEmpty(): boolean {
    return this.offset === 0
  }
  skip(n: number): boolean {
    this.offset += n
    return this.offset <= this.size
  }
  set(bytes: Uint8Array, offset: number) {
    this.data.set(bytes, offset)
  }
  boolean(value: boolean): boolean {
    this.data[this.offset++] = +value
    return this.offset <= this.size
  }
  uint(value: number): boolean {
    if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
      value = 0
    }
    while (value >= 0x80) {
      this.data[this.offset++] = value % 0x100 | 0x80
      value = Math.floor(value / 128)
    }
    this.data[this.offset++] = value
    return this.offset <= this.size
  }
  int(value: number): boolean {
    value = Math.round(value)
    return this.uint(value >= 0 ? value * 2 : value * -2 - 1)
  }
  string(value: string): boolean {
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
  flush(): Uint8Array {
    const data = this.data.slice(0, this.checkpointOffset)
    this.reset()
    return data
  }
}
