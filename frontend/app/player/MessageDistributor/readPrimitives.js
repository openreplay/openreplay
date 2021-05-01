export function readUint(buf, p) {
  var r = 0, s = 1, b;
  do {
    b = buf[p++];
    r += (b & 0x7F) * s;
    s *= 128;
  } while (b >= 0x80)
  return [r, p];
}

export function readInt(buf, p) {
  var r = readUint(buf, p);
  if (r[0] % 2) {
    r[0] = (r[0] + 1) / -2;
  } else {
    r[0] = r[0] / 2;
  }
  return r;
}

export function readString(buf, p) {
  var r = readUint(buf, p);
  var f = r[1];
  r[1] += r[0];
  r[0] = new TextDecoder().decode(buf.subarray(f, r[1]));
  return r;
}

export function readBoolean(buf, p) {
  return [!!buf[p], p+1];
}
