export default class PrimitiveReader {
  protected p = 0
  constructor(protected readonly buf: Uint8Array) {}

  hasNext() {
    return this.p < this.buf.length
  }
  
  readUint() {
    var r = 0, s = 1, b;
    do {
      b = this.buf[this.p++];
      r += (b & 0x7F) * s;
      s *= 128;
    } while (b >= 0x80)
    return r;
  }

  readInt() {
    let u = this.readUint();
    if (u % 2) {
      u = (u + 1) / -2;
    } else {
      u = u / 2;
    }
    return u;
  }

  readString() {
    var l = this.readUint();
    return new TextDecoder().decode(this.buf.subarray(this.p, this.p+=l));
  }

  readBoolean() {
    return !!this.buf[this.p++];
  }
  skip(n: number) {
    this.p += n;
  }
}
