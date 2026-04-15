export default class PrimitiveReader {
  /** pointer for curent position in the buffer */
  protected p: number = 0;

  constructor(protected buf: Uint8Array = new Uint8Array(0)) {}

  append(buf: Uint8Array) {
    const newBuf = new Uint8Array(this.buf.length + buf.length);
    newBuf.set(this.buf);
    newBuf.set(buf, this.buf.length);
    this.buf = newBuf;
  }

  hasNextByte(): boolean {
    return this.p < this.buf.length;
  }

  readUint8(): number | null {
    if (this.p >= this.buf.length) return null;
    return this.buf[this.p++];
  }

  readUint(): number | null {
    let { p } = this;
    let r = 0;
    let s = 1;
    let b;
    do {
      if (p >= this.buf.length) {
        return null;
      }
      b = this.buf[p++];
      r += (b & 0x7f) * s;
      s *= 128;
    } while (b >= 0x80);
    this.p = p;
    return r;
  }

  readCustomIndex(input: Uint8Array) {
    let p = 0;
    let r = 0;
    let s = 1;
    let b;
    do {
      if (p > 8) {
        return null;
      }
      b = input[p++];
      r += (b & 0x7f) * s;
      s *= 128;
    } while (b >= 0x80);
    return r;
  }

  readInt(): number | null {
    let u = this.readUint();
    if (u === null) {
      return u;
    }
    if (u % 2) {
      u = (u + 1) / -2;
    } else {
      u /= 2;
    }
    return u;
  }

  readString(custom?: number): string | null {
    const l = custom ?? this.readUint();
    if (l === null || this.p + l > this.buf.length) {
      return null;
    }
    return new TextDecoder().decode(this.buf.subarray(this.p, (this.p += l)));
  }

  readBoolean(): boolean | null {
    if (this.p >= this.buf.length) {
      return null;
    }
    return !!this.buf[this.p++];
  }

  readSize = (): number | null => {
    if (this.p + 3 > this.buf.length) return null;
    let size = 0;
    for (let i = 0; i < 3; i++) {
      size += this.buf[this.p + i] << (i * 8);
    }
    this.p += 3;
    return size;
  }

  skip(n: number) {
    this.p += n;
  }
}
