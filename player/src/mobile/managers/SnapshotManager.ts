import ListWalker from '../../common/ListWalker';
import parseFrames, { FrameSnapshot } from '../../common/parseFrames';
import unpack from '../../common/unpack';
import unpackTar, { TarFile } from '../../common/tarball';
import { requestTarball } from '../../web/network/loadFiles';

interface Snapshots {
  [timestamp: number]: TarFile | FrameSnapshot;
}

type Timestamp = { time: number };

const FRAME_FILENAME = /(\d+)_1_(\d+)\.(jpeg|png|avif|webp)$/;

export default class SnapshotManager extends ListWalker<Timestamp> {
  private snapshots: Snapshots = {};

  private disposed = false;

  /**
   * Tar entries are named `<trackerSessionStart>_1_<frameTimestamp>.<ext>`; the
   * tracker's start differs from `session.startedAt` by the /start round trip,
   * so frames are timed against `sessionStart` like every other message.
   */
  public mapToSnapshots(files: TarFile[], sessionStart: number) {
    const frames: Array<{ time: number; file: TarFile }> = [];
    files.forEach((file) => {
      const match = file.name.match(FRAME_FILENAME);
      if (!match) return;
      frames.push({ time: parseInt(match[2], 10) - sessionStart, file });
    });
    frames.sort((a, b) => a.time - b.time);
    frames.forEach(({ time, file }) => {
      this.snapshots[time] = file;
      this.append({ time });
    });
  }

  public async loadTar(url: string, sessionStart: number, signal?: AbortSignal) {
    const tar = unpack(await requestTarball(url, signal));
    const files = await unpackTar(tar);
    if (this.disposed) return;
    this.mapToSnapshots(files, sessionStart);
    if (this.length === 0) {
      throw new Error('No frames in archive');
    }
  }

  public async loadFrames(
    url: string,
    sessionStart: number,
    signal?: AbortSignal,
  ) {
    const fileFormat = /\.(webp|jpeg|png|avif)$/.exec(url)?.[1] ?? 'webp';
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch frames: ${res.status}`);
    }
    const zstdBuf = await res.arrayBuffer();
    if (this.disposed) return;
    const buf = unpack(new Uint8Array(zstdBuf));
    const { snapshots, timestamps } = parseFrames(
      buf,
      sessionStart,
      fileFormat,
    );
    if (timestamps.length === 0) {
      throw new Error('No frames in file');
    }
    Object.assign(this.snapshots, snapshots);
    timestamps.forEach((msg: Timestamp) => this.append(msg));
  }

  /** @returns the frame to show when the position changed, undefined otherwise */
  public moveReady(t: number) {
    const before = this.countNow;
    const msg = this.moveGetLast(t);
    if (!msg && this.countNow === before) {
      return undefined;
    }
    // before the first frame, show the first one rather than a stale future frame
    const frame = this.current ?? this.list[0];
    return frame ? this.snapshots[frame.time] : undefined;
  }

  public clean() {
    this.disposed = true;
    this.snapshots = {};
    this.reset();
  }
}
