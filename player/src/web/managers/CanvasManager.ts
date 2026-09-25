import ListWalker from '../../common/ListWalker';
import unpackTar, { TarFile } from '../../common/tarball';
import unpack from '../../common/unpack';
import { VElement } from './DOM/VirtualDOM';
import parseFrames, { FrameSnapshot } from '../../common/parseFrames';

const playMode = {
  video: 'video',
  snaps: 'snaps',
} as const;

type PlayMode = (typeof playMode)[keyof typeof playMode];

const FRAMES_MISSING = 'FRAMES_404';
const TAR_MISSING = 'TAR_404';
const MP4_MISSING = 'MP4_404';

/** Video frames are refreshed at most this often (ms of replay time). */
const VIDEO_FRAME_STEP = 100;

type Timestamp = { time: number };

export default class CanvasManager extends ListWalker<Timestamp> {
  private fileData: string | undefined;

  private videoTag = document.createElement('video');

  private snapImage = document.createElement('img');

  private lastTs = 0;

  private playMode: PlayMode = playMode.snaps;

  private snapshots: Record<number, TarFile | FrameSnapshot> = {};

  private debugCanvas: HTMLCanvasElement | undefined;

  private readonly abortController = new AbortController();

  private destroyed = false;

  private started = false;

  /** Latest requested video position (s); seeks are coalesced towards it. */
  private targetTime: number | null = null;

  private seekingTo: number | null = null;

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
    /**
     * The replay document has scripting disabled, so the canvas bitmap is never
     * painted and frames have to reach the screen another way. See paintFrame.
     */
    private readonly useCssPaint: boolean = false,
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
        if (this.destroyed) return;
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

    this.videoTag.addEventListener('loadedmetadata', this.onVideoReady);
    this.videoTag.addEventListener('seeked', this.onSeeked);
    this.videoTag.addEventListener('error', this.onVideoError);
  }

  public mapToSnapshots(files: TarFile[]) {
    if (this.destroyed || !files.length) return;
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

  private fetchFile(url: string) {
    return fetch(url, { signal: this.abortController.signal });
  }

  loadFrames = async () => {
    if (!this.links[2]) {
      return Promise.reject(FRAMES_MISSING);
    }
    // webp, jpeg, png, avif
    const fileFormat =
      /\.(webp|jpeg|png|avif)$/.exec(this.links[2])?.[1] ?? 'webp';
    return this.fetchFile(this.links[2])
      .then((r) => {
        if (r.status === 200) {
          return r.arrayBuffer();
        }
        return Promise.reject(FRAMES_MISSING);
      })
      .then((zstdBuf) => {
        if (this.destroyed) return;
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
    return this.fetchFile(this.links[0])
      .then((r) => {
        if (r.status === 200) {
          return r.arrayBuffer();
        }
        return Promise.reject(TAR_MISSING);
      })
      .then((buf) => {
        if (this.destroyed) return [];
        const tar = unpack(new Uint8Array(buf));
        this.playMode = playMode.snaps;
        return unpackTar(tar);
      });
  };

  loadMp4 = async () => {
    if (!this.links[1]) {
      return Promise.reject(MP4_MISSING);
    }
    return this.fetchFile(this.links[1])
      .then((r) => {
        if (r.status === 200) {
          return r.blob();
        }
        return Promise.reject(MP4_MISSING);
      })
      .then((blob) => {
        if (this.destroyed) return;
        this.playMode = playMode.video;
        this.fileData = URL.createObjectURL(blob);
        // playback may have reached the canvas while the frames/tar lookups were still failing
        if (this.started) {
          this.attachVideo();
        }
      });
  };

  /** Idempotent: called when playback reaches the canvas node (again after a rewind). */
  startVideo = () => {
    if (this.destroyed) return;
    this.started = true;
    if (this.playMode === playMode.snaps) {
      this.snapImage.onload = () => {
        const canvasEl = this.getCanvas();
        if (!canvasEl) return;
        if (!this.useCssPaint) {
          const canvasCtx = canvasEl.getContext('2d');
          canvasCtx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
          canvasCtx?.drawImage(
            this.snapImage,
            0,
            0,
            canvasEl.width,
            canvasEl.height,
          );
        }
        this.debugCanvas
          ?.getContext('2d')
          ?.drawImage(this.snapImage, 0, 0, 300, 200);
      };
    } else {
      this.attachVideo();
    }
  };

  private attachVideo() {
    if (!this.fileData || this.videoTag.getAttribute('src')) return;
    this.videoTag.muted = true;
    this.videoTag.playsInline = true;
    this.videoTag.preload = 'auto';
    this.videoTag.crossOrigin = 'anonymous';
    this.videoTag.src = this.fileData;
  }

  move(t: number) {
    if (this.destroyed) return;
    if (this.playMode === playMode.video) {
      this.moveReadyVideo(t);
    } else {
      this.moveReadySnap(t);
    }
  }

  /** Rewind support: forget the playback position so the next move repaints. */
  reset(): void {
    super.reset();
    this.prevTs = 0;
    this.lastTs = 0;
    this.targetTime = null;
  }

  moveReadyVideo = (t: number) => {
    if (Math.abs(t - this.lastTs) < VIDEO_FRAME_STEP) return;
    this.lastTs = t;
    const playTime = t - this.delta;
    if (playTime <= 0 || !this.getCanvas()) return;
    if (!this.videoTag.paused) {
      this.videoTag.pause();
    }
    this.requestVideoFrame(playTime / 1000);
  };

  // Seeking is async: drawing right after setting currentTime paints the previous frame.
  private requestVideoFrame(sec: number) {
    const video = this.videoTag;
    const duration = video.duration;
    this.targetTime = Number.isFinite(duration)
      ? Math.min(sec, duration)
      : sec;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return; // onVideoReady picks it up
    if (this.seekingTo !== null) return; // onSeeked continues to the latest target
    this.seekingTo = this.targetTime;
    video.currentTime = this.targetTime;
  }

  private onVideoReady = () => {
    if (this.targetTime !== null && this.seekingTo === null) {
      this.requestVideoFrame(this.targetTime);
    }
  };

  private onSeeked = () => {
    const reached = this.seekingTo;
    this.seekingTo = null;
    if (this.destroyed) return;
    if (this.targetTime !== null && this.targetTime !== reached) {
      this.requestVideoFrame(this.targetTime);
      return;
    }
    this.drawVideoFrame();
  };

  private onVideoError = () => {
    this.seekingTo = null;
  };

  private drawVideoFrame() {
    const canvasEl = this.getCanvas();
    if (!canvasEl) return;
    const canvasCtx = canvasEl.getContext('2d');
    canvasCtx?.drawImage(this.videoTag, 0, 0, canvasEl.width, canvasEl.height);
    if (this.useCssPaint) {
      // Unlike the snapshot modes there is no per-frame image to hand to
      // paintFrame, so re-encode what was just drawn. Quality is high because
      // this is a second lossy pass over already-lossy video frames.
      // The bitmap cannot be tainted (the video plays a same-origin blob
      // URL), so toBlob will not fail on security grounds.
      canvasEl.toBlob(
        (blob) => {
          if (!blob || this.destroyed) return;
          const url = URL.createObjectURL(blob);
          this.paintFrame(url);
          this.retainFrame(url);
        },
        'image/webp',
        0.95,
      );
    }
  }

  previousBlob: string = '';

  private warnedMissingNode = false;

  private getCanvas(): HTMLCanvasElement | undefined {
    const canvasEl = this.getNode(parseInt(this.nodeId, 10))?.node as
      | HTMLCanvasElement
      | undefined;
    if (!canvasEl && !this.warnedMissingNode) {
      // Once per manager: frames keep arriving, and a node that is merely late
      // (or whose page is gone) would otherwise flood the console.
      this.warnedMissingNode = true;
      console.error(`CanvasManager: Node ${this.nodeId} not found`);
    }
    return canvasEl;
  }

  /**
   * Render the current frame as the canvas element's CSS background.
   *
   * The replay iframe is sandboxed without allow-scripts (see Screen.ts), so
   * scripting is disabled for its document — and per the HTML spec a <canvas>
   * in a script-disabled document renders its *fallback content* instead of its
   * bitmap. drawImage() still fills the bitmap (getImageData reads it straight
   * back), nothing throws and nothing logs, so the canvas just silently stays
   * blank. A CSS background is painted either way and reproduces drawImage's
   * stretch-to-content-box geometry exactly.
   *
   * This and the bitmap path are mutually exclusive — only one of them can ever
   * be visible, and doing both would decode every frame twice.
   */
  private paintFrame = (blobUrl: string) => {
    const canvasEl = this.getCanvas();
    if (!canvasEl) return;
    Object.assign(canvasEl.style, {
      backgroundImage: `url("${blobUrl}")`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      // The bitmap is painted into the content box, so anchor the background
      // there too — otherwise a padded canvas would be offset against it.
      backgroundOrigin: 'content-box',
      backgroundClip: 'content-box',
    });
  };

  /** Take ownership of the displayed frame and release the one it replaced. */
  private retainFrame(blobUrl: string) {
    const previous = this.previousBlob;
    this.previousBlob = blobUrl;
    if (previous && previous !== blobUrl) {
      URL.revokeObjectURL(previous);
    }
  }

  moveReadySnap = (t: number) => {
    const msg = this.getNew(t);
    if (msg) {
      const file = this.snapshots[msg.time];
      if (file) {
        const blobUrl = file.getBlobUrl();
        if (this.useCssPaint) {
          this.paintFrame(blobUrl);
        }
        // Decoding into the <img> is only worth it if something consumes it:
        // the canvas bitmap, or the debug strip when it is switched on.
        if (!this.useCssPaint || this.debugCanvas) {
          this.snapImage.src = blobUrl;
        }
        this.retainFrame(blobUrl);
      }
    }
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.abortController.abort();

    const video = this.videoTag;
    video.removeEventListener('loadedmetadata', this.onVideoReady);
    video.removeEventListener('seeked', this.onSeeked);
    video.removeEventListener('error', this.onVideoError);
    if (video.getAttribute('src')) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    this.snapImage.onload = null;
    this.snapImage.removeAttribute('src');

    if (this.fileData) {
      URL.revokeObjectURL(this.fileData);
      this.fileData = undefined;
    }
    if (this.previousBlob) {
      URL.revokeObjectURL(this.previousBlob);
      this.previousBlob = '';
    }
    this.snapshots = {};
    this.targetTime = null;
    this.seekingTo = null;

    const debugContainer = this.debugCanvas?.parentElement;
    this.debugCanvas?.remove();
    this.debugCanvas = undefined;
    if (debugContainer && !debugContainer.childElementCount) {
      debugContainer.remove();
    }
  }
}
