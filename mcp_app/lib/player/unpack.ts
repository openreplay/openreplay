import * as fzstd from 'fzstd';
import { gunzipSync } from 'fflate';

const unpack = (b: Uint8Array): Uint8Array => {
  const isZstd =
    b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd;
  const isGzip = b[0] === 0x1f && b[1] === 0x8b && b[2] === 0x08;
  let data = b;
  if (isGzip) {
    const now = Date.now();
    const uData = gunzipSync(b);
    console.error(
      'Gunzip time',
      `${Date.now() - now}ms`,
      'size',
      Math.floor(b.byteLength / 1024),
      '->',
      Math.floor(uData.byteLength / 1024),
      'kb',
    );
    data = uData;
  }
  if (isZstd) {
    const now = Date.now();
    const uData = fzstd.decompress(b);
    console.error(
      'Zstd unpack time',
      `${Date.now() - now}ms`,
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
