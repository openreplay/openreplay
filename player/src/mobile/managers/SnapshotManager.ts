import ListWalker from '../../common/ListWalker';
import parseFrames, { FrameSnapshot } from '../../common/parseFrames';
import unpack from '../../common/unpack';
import { TarFile } from 'js-untar';

interface Snapshots {
  [timestamp: number]: TarFile | FrameSnapshot;
}

type Timestamp = { time: number };

export default class SnapshotManager extends ListWalker<Timestamp> {
  private snapshots: Snapshots = {};

  public mapToSnapshots(files: TarFile[]) {
    const filenameRegexp = /(\d+)_1_(\d+)\.(jpeg|png|avif|webp)$/;
    const firstPair = files[0].name.match(filenameRegexp);
    const sessionStart = firstPair ? parseInt(firstPair[1], 10) : 0;
    files.forEach((file) => {
      const [_, _2, imageTimestamp] = file.name
        .match(filenameRegexp)
        ?.map((n) => parseInt(n, 10)) ?? [0, 0, 0];
      const messageTime = imageTimestamp - sessionStart;
      this.snapshots[messageTime] = file;
      this.append({ time: messageTime });
    });
  }

  public async loadFrames(url: string, sessionStart: number) {
    const fileFormat = /\.(webp|jpeg|png|avif)$/.exec(url)?.[1] ?? 'webp';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch frames: ${res.status}`);
    }
    const zstdBuf = await res.arrayBuffer();
    const buf = unpack(new Uint8Array(zstdBuf));
    const { snapshots, timestamps } = parseFrames(
      buf,
      sessionStart,
      fileFormat,
    );
    Object.assign(this.snapshots, snapshots);
    timestamps.forEach((msg: Timestamp) => this.append(msg));
  }

  public moveReady(t: number) {
    const msg = this.moveGetLast(t);
    if (msg) {
      return this.snapshots[msg.time];
    }
  }

  public clean() {
    this.snapshots = {};
    this.reset();
  }
}
