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
  buffer: ArrayBuffer,
  sessionStart: number,
): ParsedFrames {
  const view = new DataView(buffer);
  const snapshots: Record<number, FrameSnapshot> = {};
  const timestamps: Timestamp[] = [];
  let offset = 0;
  let prevTime = -Infinity;
  let isSorted = true;

  while (offset + 12 <= buffer.byteLength) {
    // uint64 LE timestamp
    const tsLow = view.getUint32(offset, true);
    const tsHigh = view.getUint32(offset + 4, true);
    const ts = tsHigh * 0x100000000 + tsLow;
    offset += 8;

    // uint32 LE payload size
    const size = view.getUint32(offset, true);
    offset += 4;

    if (offset + size > buffer.byteLength) break;

    const time = ts - sessionStart;

    // Keep a view into the original buffer — no copy until getBlobUrl() is called
    const dataView = new Uint8Array(buffer, offset, size);
    let cachedUrl: string | undefined;

    snapshots[time] = {
      getBlobUrl() {
        if (cachedUrl === undefined) {
          cachedUrl = URL.createObjectURL(
            new Blob([dataView], { type: 'image/webp' }),
          );
        }
        return cachedUrl;
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
