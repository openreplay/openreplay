declare global {
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
  }
}

function dummyTrack(): { track: MediaStreamTrack; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2; // Doesn't work when 1 (?!)
  const ctx = canvas.getContext('2d');
  let frame = 0;
  const draw = () => {
    ctx?.fillRect(0, 0, canvas.width, canvas.height);
    frame = requestAnimationFrame(draw);
  };
  draw();
  const track = canvas.captureStream(60).getTracks()[0];
  return {
    track,
    stop: () => {
      cancelAnimationFrame(frame);
      track.stop();
    },
  };
}

export function RequestLocalStream(): Promise<LocalStream> {
  return navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((aStream) => {
      const aTrack = aStream.getAudioTracks()[0];
      if (!aTrack) {
        throw new Error('No audio tracks provided');
      }
      return new _LocalStream(aTrack);
    });
}

class _LocalStream {
  private mediaRequested: boolean = false;

  private mediaRequest: Promise<boolean> | null = null;

  private stopped = false;

  readonly stream: MediaStream;

  private readonly dummyVideo: ReturnType<typeof dummyTrack>;

  private readonly videoTrackListeners = new Set<(t: MediaStreamTrack) => void>();

  constructor(aTrack: MediaStreamTrack) {
    this.dummyVideo = dummyTrack();
    this.stream = new MediaStream([aTrack, this.dummyVideo.track]);
  }

  toggleVideo(): Promise<boolean> {
    if (!this.mediaRequested) {
      if (!this.mediaRequest) {
        this.mediaRequest = navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((vStream) => {
            if (this.stopped) {
              vStream.getTracks().forEach((t) => t.stop());
              return false;
            }
            const vTrack = vStream.getVideoTracks()[0];
            if (!vTrack) {
              throw new Error('No video track provided');
            }
            this.stream.addTrack(vTrack);
            this.stream.removeTrack(this.dummyVideo.track);
            this.dummyVideo.stop();
            this.mediaRequested = true;
            this.videoTrackListeners.forEach((cb) => cb(vTrack));
            return true;
          })
          .catch((e) => {
            // TODO: log
            console.error(e);
            return false;
          })
          .finally(() => {
            this.mediaRequest = null;
          });
      }
      return this.mediaRequest;
    }
    let enabled = true;
    this.stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled = enabled && !track.enabled;
    });
    return Promise.resolve(enabled);
  }

  toggleAudio(): boolean {
    let enabled = true;
    this.stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled = enabled && !track.enabled;
    });
    return enabled;
  }

  /** @returns unsubscribe */
  onVideoTrack(cb: (t: MediaStreamTrack) => void): () => void {
    this.videoTrackListeners.add(cb);
    return () => {
      this.videoTrackListeners.delete(cb);
    };
  }

  stop() {
    this.stopped = true;
    this.stream.getTracks().forEach((t) => t.stop());
    this.dummyVideo.stop();
    this.videoTrackListeners.clear();
  }
}

export type LocalStream = InstanceType<typeof _LocalStream>;
