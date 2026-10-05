/** 1 = legacy MFileReader stream, 2 = tracker player batches, 3 = tracker asset batches (read like 2) */
export type ProtoFormat = 1 | 2 | 3;

const HEADER_SIZE = 8;
const HEADER_V1 = 0xff;
const HEADER_V2 = 0xfe;
const HEADER_V3 = 0xfd;
const FIRST_V2_TRACKER_MAJOR = 18;

/** Version byte of the 8-byte mob header (7x 0xff + version), or 0 when there's no header. */
export function headerVersion(data: Uint8Array, offset = 0): number {
  if (data.length - offset < HEADER_SIZE) return 0;
  for (let i = offset; i < offset + 7; i++) {
    if (data[i] !== 0xff) return 0;
  }
  const v = data[offset + 7];
  return v === HEADER_V1 || v === HEADER_V2 || v === HEADER_V3 ? v : 0;
}

export function stripHeader(data: Uint8Array): Uint8Array {
  return headerVersion(data) ? data.subarray(HEADER_SIZE) : data;
}

function trackerMajor(trackerVersion?: string): number | null {
  const major = parseInt(trackerVersion ?? '', 10);
  return Number.isNaN(major) ? null : major;
}

/**
 * Files without a header (a dom.mobe tail the backend uploaded as the first file)
 * carry no format marker; trackers before v18 only wrote the legacy format.
 */
export function detectProtoFormat(
  data: Uint8Array,
  trackerVersion?: string,
): ProtoFormat {
  const version = headerVersion(data);
  if (version === HEADER_V2) return 2;
  if (version === HEADER_V3) return 3;
  if (version === HEADER_V1) return 1;
  const major = trackerMajor(trackerVersion);
  return major !== null && major < FIRST_V2_TRACKER_MAJOR ? 1 : 3;
}
