declare global {
   interface HTMLCanvasElement {
     captureStream(frameRate?: number): MediaStream;
  }
}

function dummyTrack(): MediaStreamTrack { 
  const canvas = document.createElement('canvas')//, { width: 0, height: 0})
  canvas.width=canvas.height=2 // Doesn't work when 1 (?!)
  const ctx = canvas.getContext('2d')
  ctx?.fillRect(0, 0, canvas.width, canvas.height)
  requestAnimationFrame(function draw(){
    ctx?.fillRect(0,0, canvas.width, canvas.height)
    requestAnimationFrame(draw)
  })
  // Also works. Probably it should be done once connected.
  //setTimeout(() => { ctx?.fillRect(0,0, canvas.width, canvas.height) }, 4000)
  return canvas.captureStream(60).getTracks()[0]
}

export default function RequestLocalStream(): Promise<LocalStream> {
  return navigator.mediaDevices.getUserMedia({ audio:true, })
    .then(aStream => {
      const aTrack = aStream.getAudioTracks()[0]

      if (!aTrack) { throw new Error('No audio tracks provided') }
      return new _LocalStream(aTrack)
    })
}

class _LocalStream {
  private mediaRequested = false
  readonly stream: MediaStream
  private readonly vdTrack: MediaStreamTrack
  constructor(aTrack: MediaStreamTrack) {
    this.vdTrack = dummyTrack()
    this.stream = new MediaStream([ aTrack, this.vdTrack, ])
  }

  toggleVideo(): Promise<boolean> {
    if (!this.mediaRequested) {
      return navigator.mediaDevices.getUserMedia({video:true,})
      .then(vStream => {
        const vTrack = vStream.getVideoTracks()[0]
        if (!vTrack) {
          throw new Error('No video track provided')
        }
        this.stream.addTrack(vTrack)
        this.stream.removeTrack(this.vdTrack)
        this.mediaRequested = true
        if (this.onVideoTrackCb) {
          this.onVideoTrackCb(vTrack)
        }
        return true
      })
      .catch(e => {
        // TODO: log
        console.error(e)
        return false
      })
    }
    let enabled = true
    this.stream.getVideoTracks().forEach(track => {
      track.enabled = enabled = enabled && !track.enabled
    })
    return Promise.resolve(enabled)
  }

  toggleAudio(): boolean {
    let enabled = true
    this.stream.getAudioTracks().forEach(track => {
      track.enabled = enabled = enabled && !track.enabled
    })
    return enabled
  }

  private onVideoTrackCb: ((t: MediaStreamTrack) => void) | null = null
  onVideoTrack(cb: (t: MediaStreamTrack) => void) {
    this.onVideoTrackCb = cb
  }

  stop() {
    this.stream.getTracks().forEach(t => t.stop())
  }
}

export type LocalStream = InstanceType<typeof _LocalStream>
