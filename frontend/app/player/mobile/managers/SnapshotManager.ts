import { TarFile } from 'js-untar';
import ListWalker from 'Player/common/ListWalker';

interface Snapshots {
  [timestamp: number]: TarFile;
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
