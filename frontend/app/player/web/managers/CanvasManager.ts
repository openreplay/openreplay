import { VElement } from "Player/web/managers/DOM/VirtualDOM";

export default class CanvasManager {
  private readonly file;
  private canvasEl: HTMLVideoElement

  constructor(
    private readonly nodeId: string,
    private readonly creationTs: number,
    private readonly delta: number,
    private readonly filename: string,
    private readonly getNode: (id: number) => VElement | undefined) {
      const fileUrl = filename
  }

  startVideo(videoData: any) {
    this.canvasEl = this.getNode(parseInt(this.nodeId, 10)) as unknown as HTMLVideoElement
    this.canvasEl.src = videoData;
  }

  move(t: number) {
    const playTime = t - this.delta
    if (playTime > 0) {
      this.canvasEl.currentTime = playTime;
    }
  }
}