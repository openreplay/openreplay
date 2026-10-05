const decoder = new TextDecoder();
// Below this length a JS loop beats the TextDecoder call overhead for ASCII (tag and attribute names);
// longer concatenations become V8 cons-strings that cost memory and later flattening
const ASCII_FAST_PATH_MAX = 12;

export default class PrimitiveReader {
  /** pointer for curent position in the buffer */
  protected p: number = 0;

  constructor(protected buf: Uint8Array = new Uint8Array(0)) {}

  /** Keeps only the unread tail plus the new data, so parsed files don't stay in memory. */
  append(buf: Uint8Array): void {
    const consumed = Math.min(this.p, this.buf.length);
    if (consumed === this.buf.length) {
      this.buf = buf;
    } else {
      const rest = this.buf.length - consumed;
      const newBuf = new Uint8Array(rest + buf.length);
      newBuf.set(this.buf.subarray(consumed));
      newBuf.set(buf, rest);
      this.buf = newBuf;
    }
    this.p -= consumed;
  }

  /** Drops the buffer once everything in it was read (the last file would stay in memory otherwise). */
  releaseConsumed(): void {
    if (this.p >= this.buf.length) {
      this.buf = new Uint8Array(0);
      this.p = 0;
    }
  }

  hasNextByte(): boolean {
    return this.p < this.buf.length;
  }

  hasReadAll(): boolean {
    return this.p === this.buf.length;
  }

  getBufferSize() {
    return this.buf.length;
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
    const start = this.p;
    const end = (this.p += l);
    if (l <= ASCII_FAST_PATH_MAX) {
      let s = '';
      for (let i = start; i < end; i++) {
        const c = this.buf[i];
        if (c > 0x7f) {
          return decoder.decode(this.buf.subarray(start, end));
        }
        s += String.fromCharCode(c);
      }
      return s;
    }
    return decoder.decode(this.buf.subarray(start, end));
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
