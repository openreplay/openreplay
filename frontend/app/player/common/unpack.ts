import { gunzipSync } from 'fflate';
import * as fzstd from 'fzstd';

// fzstd's one-shot decompress computes bit positions as `byteOffset << 3` (int32),
// which overflows once the input passes 256MiB and fails with "invalid zstd data".
// The streaming decoder only ever indexes into the chunk it was pushed.
const ZSTD_ONESHOT_LIMIT = 1 << 28;
const ZSTD_CHUNK = 1 << 20;

const zstdDecompress = (b: Uint8Array): Uint8Array => {
  if (b.byteLength < ZSTD_ONESHOT_LIMIT) return fzstd.decompress(b);
  const parts: Uint8Array[] = [];
  let length = 0;
  const stream = new fzstd.Decompress((chunk) => {
    parts.push(chunk);
    length += chunk.length;
  });
  for (let i = 0; i < b.byteLength; i += ZSTD_CHUNK) {
    stream.push(b.subarray(i, i + ZSTD_CHUNK), i + ZSTD_CHUNK >= b.byteLength);
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const unpack = (b: Uint8Array): Uint8Array => {
  // zstd magical numbers 40 181 47 253
  const isZstd =
    b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd;
  const isGzip = b[0] === 0x1f && b[1] === 0x8b && b[2] === 0x08;
  let data = b;
  if (isGzip) {
    const now = performance.now();
    const uData = gunzipSync(b);
    console.debug(
      'Gunzip time',
      `${Math.floor(performance.now() - now)}ms`,
      'size',
      Math.floor(b.byteLength / 1024),
      '->',
      Math.floor(uData.byteLength / 1024),
      'kb',
    );
    data = uData;
  }
  if (isZstd) {
    const now = performance.now();
    const uData = zstdDecompress(b);
    console.debug(
      'Zstd unpack time',
      `${Math.floor(performance.now() - now)}ms`,
      'size',
      Math.floor(b.byteLength / 1024),
      '->',
      Math.floor(uData.byteLength / 1024),
      'kb',
    );
    data = uData;
  }
  return data;
};

export default unpack;
