import App from '../../app/index.js'

export const Quality = {
  Standard: { width: 1280, height: 720 },
  High: { width: 1920, height: 1080 },
}

export default class Recorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null
  private recStartTs: number | null = null

  constructor(private readonly app: App) {}

  async startRecording(
    fps: number,
    quality: (typeof Quality)[keyof typeof Quality],
    micReq: boolean,
    camReq: boolean,
  ) {
    this.recStartTs = this.app.timestamp()

    const videoConstraints: MediaTrackConstraints = quality
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: camReq ? { ...videoConstraints, frameRate: { ideal: fps } } : false,
        audio: micReq,
      })

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9',
      })

      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
    } catch (error) {
      console.error(error)
    }
  }

  async stopRecording() {
    return new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder) return

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: 'video/webm',
        })
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  async sendToAPI() {
    const blob = await this.stopRecording()
    // const formData = new FormData()
    // formData.append('file', blob, 'record.webm')
    // formData.append('start', this.recStartTs?.toString() ?? '')

    return fetch(`${this.app.options.ingestPoint}/v1/web/uxt/upload-url`, {
      headers: {
        Authorization: `Bearer ${this.app.session.getSessionToken() as string}`,
      },
    })
      .then((r) => {
        if (r.ok) {
          return r.json()
        } else {
          throw new Error('Failed to get upload url')
        }
      })
      .then(({ url }) => {
        return fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/webm',
          },
          body: blob,
        })
      })
      .catch(console.error)
      .finally(() => {
        this.discard()
      })
  }

  async saveToFile(fileName = 'recorded-video.webm') {
    const blob = await this.stopRecording()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()

    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  discard() {
    this.mediaRecorder?.stop()
    this.stream?.getTracks().forEach((track) => track.stop())
  }
}
