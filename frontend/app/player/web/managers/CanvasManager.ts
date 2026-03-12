import ListWalker from 'Player/common/ListWalker';
import parseFrames, { FrameSnapshot } from 'Player/common/parseFrames';
import unpackTar from 'Player/common/tarball';
import unpack from 'Player/common/unpack';
import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import { TarFile } from 'js-untar';

const playMode = {
  video: 'video',
  snaps: 'snaps',
} as const;

const FRAMES_MISSING = 'FRAMES_404';
const TAR_MISSING = 'TAR_404';
const MP4_MISSING = 'MP4_404';

type Timestamp = { time: number };

export default class CanvasManager extends ListWalker<Timestamp> {
  private fileData: string | undefined;

  private videoTag = document.createElement('video');

  private snapImage = document.createElement('img');

  private lastTs = 0;

  private playMode: string = playMode.snaps;

  private snapshots: Record<number, TarFile | FrameSnapshot> = {};

  private debugCanvas: HTMLCanvasElement | undefined;

  constructor(
    /**
     * Canvas node id
     * */
    private readonly nodeId: string,
    /**
     * time between node creation and session start
     */
    private readonly delta: number,
    private readonly links: [tar?: string, mp4?: string, frames?: string],
    private readonly getNode: (id: number) => VElement | undefined,
    private readonly sessionStart: number,
  ) {
    super();
    // try frames first, then tar, then mp4
    this.loadFrames()
      .catch((e) => {
        if (e === FRAMES_MISSING)
          return this.loadTar().then((fileArr) => this.mapToSnapshots(fileArr));
        throw e;
      })
      .catch((e) => {
        if (e === TAR_MISSING) return this.loadMp4();
        throw e;
      })
      .catch((e) => {
        if (e === MP4_MISSING) {
          console.error(`No canvas recording found for node ${this.nodeId}`);
        } else {
          console.error(
            'Failed to load canvas recording for node',
            this.nodeId,
          );
        }
      });

    // @ts-ignore
    if (window.__or_debug === true) {
      let debugContainer = document.querySelector<HTMLDivElement>('.imgDebug');
      if (!debugContainer) {
        debugContainer = document.createElement('div');
        debugContainer.className = 'imgDebug';
        Object.assign(debugContainer.style, {
          position: 'fixed',
          top: '0',
          left: 0,
          display: 'flex',
          flexDirection: 'column',
        });
        document.body.appendChild(debugContainer);
      }
      const debugCanvas = document.createElement('canvas');
      debugCanvas.width = 300;
      debugCanvas.height = 200;
      this.debugCanvas = debugCanvas;
      debugContainer.appendChild(debugCanvas);
    }
  }

  public mapToSnapshots(files: TarFile[]) {
    const tempArr: Timestamp[] = [];
    const filenameRegexp = /(\d+)_(\d+)_(\d+)\.(jpeg|png|avif|webp)$/;
    const firstPair = files[0].name.match(filenameRegexp);
    if (!firstPair) {
      console.error('Invalid file name format', files[0].name);
      return;
    }

    files.forEach((file) => {
      const [_, _1, _2, imageTimestampStr] = file.name.match(
        filenameRegexp,
      ) ?? [0, 0, 0, '0'];

      const imageTimestamp = parseInt(imageTimestampStr, 10);
      const messageTime = imageTimestamp - this.sessionStart;
      this.snapshots[messageTime] = file;
      tempArr.push({ time: messageTime });
    });

    tempArr
      .sort((a, b) => a.time - b.time)
      .forEach((msg) => {
        this.append(msg);
      });
  }

  loadFrames = async () => {
    if (!this.links[2]) {
      return Promise.reject(FRAMES_MISSING);
    }
    // webp, jpeg, png, avif
    const fileFormat = /\.(webp|jpeg|png|avif)$/.exec(this.links[2])?.[1] ?? 'webp';
    return fetch(this.links[2])
      .then((r) => {
        if (r.status === 200) {
          return r.arrayBuffer();
        }
        return Promise.reject(FRAMES_MISSING);
      })
      .then((zstdBuf) => {
        const buf = unpack(new Uint8Array(zstdBuf));
        const { snapshots, timestamps } = parseFrames(
          buf,
          this.sessionStart,
          fileFormat,
        );
        Object.assign(this.snapshots, snapshots);
        this.playMode = playMode.snaps;
        timestamps.forEach((msg) => this.append(msg));
      });
  };

  loadTar = async () => {
    if (!this.links[0]) {
      return Promise.reject(TAR_MISSING);
    }
    return fetch(this.links[0])
      .then((r) => {
        if (r.status === 200) {
          return r.arrayBuffer();
        }
        return Promise.reject(TAR_MISSING);
      })
      .then((buf) => {
        const tar = unpack(new Uint8Array(buf));
        this.playMode = playMode.snaps;
        return unpackTar(tar);
      });
  };

  loadMp4 = async () => {
    if (!this.links[1]) {
      return Promise.reject(MP4_MISSING);
    }
    return fetch(this.links[1])
      .then((r) => {
        if (r.status === 200) {
          return r.blob();
        }
        return Promise.reject(MP4_MISSING);
      })
      .then((blob) => {
        this.playMode = playMode.video;
        this.fileData = URL.createObjectURL(blob);
      });
  };

  startVideo = () => {
    if (this.playMode === playMode.snaps) {
      this.snapImage.onload = () => {
        const node = this.getNode(parseInt(this.nodeId, 10));
        if (node && node.node) {
          const canvasCtx = (node.node as HTMLCanvasElement).getContext('2d');
          const canvasEl = node.node as HTMLVideoElement;
          requestAnimationFrame(() => {
            canvasCtx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
            canvasCtx?.drawImage(
              this.snapImage,
              0,
              0,
              canvasEl.width,
              canvasEl.height,
            );
          });
          this.debugCanvas
            ?.getContext('2d')
            ?.drawImage(this.snapImage, 0, 0, 300, 200);
        } else {
          console.error(`CanvasManager: Node ${this.nodeId} not found`);
        }
      };
    } else {
      if (!this.fileData) return;
      this.videoTag.setAttribute('autoplay', 'true');
      this.videoTag.setAttribute('muted', 'true');
      this.videoTag.setAttribute('playsinline', 'true');
      this.videoTag.setAttribute('crossorigin', 'anonymous');
      this.videoTag.src = this.fileData;
      this.videoTag.currentTime = 0;
    }
  };

  move(t: number) {
    if (this.playMode === playMode.video) {
      this.moveReadyVideo(t);
    } else {
      this.moveReadySnap(t);
    }
  }

  moveReadyVideo = (t: number) => {
    if (Math.abs(t - this.lastTs) < 100) return;
    this.lastTs = t;
    const playTime = t - this.delta;
    if (playTime > 0) {
      const node = this.getNode(parseInt(this.nodeId, 10));
      if (node && node.node) {
        const canvasCtx = (node.node as HTMLCanvasElement).getContext('2d');
        const canvasEl = node.node as HTMLVideoElement;
        if (!this.videoTag.paused) {
          void this.videoTag.pause();
        }
        this.videoTag.currentTime = playTime / 1000;
        canvasCtx?.drawImage(
          this.videoTag,
          0,
          0,
          canvasEl.width,
          canvasEl.height,
        );
      } else {
        console.error(`VideoMode CanvasManager: Node ${this.nodeId} not found`);
      }
    }
  };

  previousBlob: string = '';
  moveReadySnap = (t: number) => {
    const msg = this.getNew(t);
    if (msg) {
      const file = this.snapshots[msg.time];
      if (file) {
        const blobUrl = file.getBlobUrl();
        this.snapImage.src = blobUrl;
        if (this.previousBlob) {
          URL.revokeObjectURL(this.previousBlob);
        }
        this.previousBlob = blobUrl;
      }
    }
  };
}

function saveImageData(imageDataUrl: string, name: string) {
  const link = document.createElement('a');
  link.href = imageDataUrl;
  link.download = name;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
