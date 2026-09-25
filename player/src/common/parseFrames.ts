export interface FrameSnapshot {
  getBlobUrl: () => string;
}

type Timestamp = { time: number };

export interface ParsedFrames {
  snapshots: Record<number, FrameSnapshot>;
  timestamps: Timestamp[];
}

/**
 * Parses a .frames binary file (format: [uint64 LE timestamp][uint32 LE size][data] per frame)
 * and returns snapshots + sorted timestamps compatible with CanvasManager.
 *
 * Blob URLs are created lazily (only when getBlobUrl() is first called) to avoid
 * upfront allocation for frames that may never be displayed.
 */
export default function parseFrames(
  input: ArrayBuffer | Uint8Array,
  sessionStart: number,
  fileFormat: string,
): ParsedFrames {
  // Uint8Arrays from decompressors (fzstd/fflate) can be views into a larger
  // ArrayBuffer with a non-zero byteOffset, so always go through the view's bounds.
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const snapshots: Record<number, FrameSnapshot> = {};
  const timestamps: Timestamp[] = [];
  let offset = 0;
  let prevTime = -Infinity;
  let isSorted = true;

  while (offset + 12 <= bytes.byteLength) {
    // uint64 LE timestamp
    const tsLow = view.getUint32(offset, true);
    const tsHigh = view.getUint32(offset + 4, true);
    const ts = tsHigh * 0x100000000 + tsLow;
    offset += 8;

    // uint32 LE payload size
    const size = view.getUint32(offset, true);
    offset += 4;

    if (offset + size > bytes.byteLength) break;

    const time = ts - sessionStart;

    // Keep a view into the original buffer — no copy until getBlobUrl() is called
    const dataView = bytes.subarray(offset, offset + size);

    snapshots[time] = {
      getBlobUrl() {
        return URL.createObjectURL(
          new Blob([dataView as Uint8Array<ArrayBuffer>], {
            type: `image/${sniffImageFormat(dataView) ?? fileFormat}`,
          }),
        );
      },
    };

    if (time < prevTime) isSorted = false;
    prevTime = time;

    timestamps.push({ time });
    offset += size;
  }

  if (!isSorted) {
    timestamps.sort((a, b) => a.time - b.time);
  }

  return { snapshots, timestamps };
}

/** The frames URL never carries the image type (iOS sends JPEG), so read the magic bytes. */
function sniffImageFormat(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'png';
  }
  // RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {
    return 'webp';
  }
  // ....ftypavif
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return 'avif';
  }
  return null;
}
