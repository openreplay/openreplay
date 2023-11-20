import { VElement } from "Player/web/managers/DOM/VirtualDOM";

export default class CanvasManager {
  private fileData: string | undefined;
  private canvasEl: HTMLVideoElement
  private videoTag = document.createElement('video')

  constructor(
    private readonly nodeId: string,
    private readonly creationTs: number,
    private readonly delta: number,
    private readonly filename: string,
    private readonly getNode: (id: number) => VElement | undefined) {
      fetch(this.filename).then((r) => {
        // mp4 file
        if (r.status === 200) {
          r.blob().then((blob) => {
            this.fileData = URL.createObjectURL(blob);
          console.log(blob, this.fileData)
          })
        } else {
          return Promise.reject(`File ${this.filename} not found`)
        }
      }).catch(console.error)
  }

  startVideo = () => {
    if (!this.fileData) return;
    const node = this.getNode(parseInt(this.nodeId, 10)) as unknown as VElement
    (node.node as HTMLVideoElement).setAttribute('autoplay', 'true');
    (node.node as HTMLVideoElement).setAttribute('muted', 'true');
    (node.node as HTMLVideoElement).setAttribute('playsinline', 'true');
    (node.node as HTMLVideoElement).setAttribute('crossorigin', 'anonymous');
    (node.node as HTMLVideoElement).src = this.fileData;
    (node.node as HTMLVideoElement).currentTime = 0;
    this.canvasEl = node.node as HTMLVideoElement;
  }

  move(t: number) {
    const playTime = t - this.delta
    if (playTime > 0) {
      if (!this.canvasEl.paused) {
          void this.canvasEl.pause()
      }
      this.canvasEl.currentTime = playTime/1000;
    }
  }
}