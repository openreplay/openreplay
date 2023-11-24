import { VElement } from "Player/web/managers/DOM/VirtualDOM";

export default class CanvasManager {
  private fileData: string | undefined;
  private canvasEl: HTMLVideoElement
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private videoTag = document.createElement('video')
  private lastTs = 0;

  constructor(
    private readonly nodeId: string,
    private readonly delta: number,
    private readonly filename: string,
    private readonly getNode: (id: number) => VElement | undefined) {
      // getting mp4 file composed from canvas snapshot images
      fetch(this.filename).then((r) => {
        if (r.status === 200) {
          r.blob().then((blob) => {
            this.fileData = URL.createObjectURL(blob);
          })
        } else {
          return Promise.reject(`File ${this.filename} not found`)
        }
      }).catch(console.error)
  }

  startVideo = () => {
    if (!this.fileData) return;
    this.videoTag.setAttribute('autoplay', 'true');
    this.videoTag.setAttribute('muted', 'true');
    this.videoTag.setAttribute('playsinline', 'true');
    this.videoTag.setAttribute('crossorigin', 'anonymous');
    this.videoTag.src = this.fileData;
    this.videoTag.currentTime = 0;

    const node = this.getNode(parseInt(this.nodeId, 10)) as unknown as VElement
    this.canvasCtx = (node.node as HTMLCanvasElement).getContext('2d');
    this.canvasEl = node.node as HTMLVideoElement;
  }

  move(t: number) {
    if (t - this.lastTs < 100) return;
    this.lastTs = t;
    const playTime = t - this.delta
    if (playTime > 0) {
      if (!this.videoTag.paused) {
          void this.videoTag.pause()
      }
      this.videoTag.currentTime = playTime/1000;
      this.canvasCtx?.drawImage(this.videoTag, 0, 0, this.canvasEl.width, this.canvasEl.height);
    }
  }
}