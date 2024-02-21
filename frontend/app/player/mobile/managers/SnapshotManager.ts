import ListWalker from 'Player/common/ListWalker';

type ImageTimestamp = number
type SessionStartTs = number
type SnapshotFile = `${SessionStartTs}_1_${ImageTimestamp}`

interface Snapshots {
  [timestamp: number]: SnapshotFile
}

type Timestamp = { time: number }


export default class SnapshotManager extends ListWalker<Timestamp> {
  private snapshots: Snapshots = {}

  constructor(private readonly onSnapshotChange: (filedata: string) => void) {
    super();
  }

  mapToSnapshots(files: SnapshotFile[]) {
    const sessionStart = parseInt(files[0].split('_')[0], 10)
    files.forEach(file => {
      const [_, _2, imageTimestamp] = file
        .split('_')
        .map(n => parseInt(n, 10))
      const messageTime = imageTimestamp - sessionStart
      this.snapshots[messageTime] = file
      this.append({ time: messageTime })
    })
  }

  moveReady(t: number) {
    const msg = this.moveGetLast(t)
    if (msg) {
      this.onSnapshotChange(this.snapshots[msg.time])
    }
  }
}