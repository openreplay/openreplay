export default class PrimitiveReader {
  /** pointer for curent position in the buffer */
  protected p: number = 0
  constructor(protected buf: Uint8Array = new Uint8Array(0)) {}

  append(buf: Uint8Array) {
    const newBuf = new Uint8Array(this.buf.length + buf.length)
    newBuf.set(this.buf)
    newBuf.set(buf, this.buf.length)
    this.buf = newBuf
  }

  hasNextByte(): boolean {
    return this.p < this.buf.length
  }
  
  readUint(): number | null {
    let p = this.p, r = 0, s = 1, b
    do {
      if (p >= this.buf.length) {
        return null
      }
      b = this.buf[ p++ ]
      r += (b & 0x7F) * s
      s *= 128;
    } while (b >= 0x80)
    this.p = p
    return r;
  }

  readCustomIndex(input: Uint8Array) {
    let p = 0, r = 0, s = 1, b
    do {
      if (p > 8) {
        return null
      }
      b = input[ p++ ]
      r += (b & 0x7F) * s
      s *= 128;
    } while (b >= 0x80)
    return r;
  }

  readInt(): number | null {
    let u = this.readUint();
    if (u === null) { return u }
    if (u % 2) {
      u = (u + 1) / -2;
    } else {
      u = u / 2;
    }
    return u;
  }

  readString(): string | null {
    var l = this.readUint();
    if (l === null || this.p + l > this.buf.length) { return null }
    return new TextDecoder().decode(this.buf.subarray(this.p, this.p+=l));
  }

  readBoolean(): boolean | null {
    if (this.p >= this.buf.length) { return null }
    return !!this.buf[this.p++];
  }

  skip(n: number) {
    this.p += n;
  }
}
