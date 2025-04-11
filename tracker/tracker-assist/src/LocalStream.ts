export default function RequestLocalStream(
  pc: RTCPeerConnection,
  toggleVideoCb?: () => void
): Promise<LocalStream> {
  return navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      const aTrack = stream.getAudioTracks()[0];
      if (!aTrack) {
        throw new Error("No audio tracks provided");
      }
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      return new _LocalStream(stream, pc, toggleVideoCb);
    });
}

class _LocalStream {
  private mediaRequested = false;
  readonly stream: MediaStream;
  readonly vTrack: MediaStreamTrack;
  readonly pc: RTCPeerConnection;
  readonly toggleVideoCb?: () => void;
  constructor(stream: MediaStream, pc: RTCPeerConnection, toggleVideoCb?: () => void) {
    this.stream = stream;
    this.pc = pc;
    this.toggleVideoCb = toggleVideoCb;
  }

  toggleVideo(): Promise<boolean> {
    const videoTracks = this.stream.getVideoTracks();
    if (!this.mediaRequested) {
      return navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((vStream) => {
          const vTrack = vStream.getVideoTracks()[0];
          if (!vTrack) {
            throw new Error("No video track provided");
          }

          this.pc.addTrack(vTrack, this.stream);
          this.stream.addTrack(vTrack);

          if (this.toggleVideoCb) {
            this.toggleVideoCb();
          }

          this.mediaRequested = true;

          if (this.onVideoTrackCb) {
            this.onVideoTrackCb(vTrack);
          }
          return true;
        })
        .catch((e) => {
          // TODO: log
          return false;
        });
    } else {
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    return Promise.resolve(videoTracks[0].enabled);
  }

  toggleAudio(): boolean {
    let enabled = true;
    this.stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled = enabled && !track.enabled;
    });
    return enabled;
  }

  private onVideoTrackCb: ((t: MediaStreamTrack) => void) | null = null;
  onVideoTrack(cb: (t: MediaStreamTrack) => void) {
    this.onVideoTrackCb = cb;
  }

  stop() {
    this.stream.getTracks().forEach((t) => t.stop());
  }
}

export type LocalStream = InstanceType<typeof _LocalStream>;
