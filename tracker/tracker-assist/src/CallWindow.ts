import type { LocalStream, } from './LocalStream.js'
import attachDND from './dnd.js'

const SS_START_TS_KEY = '__openreplay_assist_call_start_ts'

export default class CallWindow {
  private readonly iframe: HTMLIFrameElement
  private vRemote: HTMLVideoElement | null = null
  private vLocal: HTMLVideoElement | null = null
  private audioBtn: HTMLElement | null = null
  private videoBtn: HTMLElement | null = null
  private endCallBtn: HTMLElement | null = null
  private agentNameElem: HTMLElement | null = null
  private videoContainer: HTMLElement | null = null
  private vPlaceholder: HTMLElement | null = null

  private tsInterval: ReturnType<typeof setInterval>

  private readonly load: Promise<void>

  constructor(private readonly logError: (...args: any[]) => void) {
    const iframe = this.iframe = document.createElement('iframe')
    Object.assign(iframe.style, {
      position: 'fixed',
      zIndex: 2147483647 - 1,
      border: 'none',
      bottom: '10px',
      right: '10px',
      height: '200px',
      width: '200px',
    })
    // TODO: find the best attribute name for the ignoring iframes
    iframe.setAttribute('data-openreplay-obscured', '')
    iframe.setAttribute('data-openreplay-hidden', '')
    iframe.setAttribute('data-openreplay-ignore', '')
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) {
      console.error('OpenReplay: CallWindow iframe document is not reachable.')
      return 
    }


    //const baseHref = "https://static.openreplay.com/tracker-assist/test"
    const baseHref = 'https://static.openreplay.com/tracker-assist/3.4.4'
    this.load = fetch(baseHref + '/index.html')
    .then(r => r.text())
    .then((text) => {
      iframe.onload = () => {
        const assistSection = doc.getElementById('or-assist')
        assistSection?.classList.remove('status-connecting')
        //iframe.style.height = doc.body.scrollHeight + 'px';
        //iframe.style.width = doc.body.scrollWidth + 'px';
        this.adjustIframeSize()
        iframe.onload = null
      }

      // ?
      text = text.replace(/href="css/g, `href="${baseHref}/css`)
      doc.open()
      doc.write(text)
      doc.close()

      
      this.vLocal = doc.getElementById('video-local') as (HTMLVideoElement | null)
      this.vRemote = doc.getElementById('video-remote') as (HTMLVideoElement | null)
      this.videoContainer = doc.getElementById('video-container')
      
      this.audioBtn = doc.getElementById('audio-btn')
      if (this.audioBtn) {
        this.audioBtn.onclick = () => this.toggleAudio()
      }
      this.videoBtn = doc.getElementById('video-btn')
      if (this.videoBtn) {
        this.videoBtn.onclick = () => this.toggleVideo()
      }
      this.endCallBtn = doc.getElementById('end-call-btn')

      this.agentNameElem = doc.getElementById('agent-name')
      this.vPlaceholder = doc.querySelector('#remote-stream p')

      const tsElem = doc.getElementById('duration')
      if (tsElem) {
        const startTs = Number(sessionStorage.getItem(SS_START_TS_KEY)) || Date.now()
        sessionStorage.setItem(SS_START_TS_KEY, startTs.toString())
        this.tsInterval = setInterval(() => {
          const ellapsed = Date.now() - startTs
          const secsFull = ~~(ellapsed / 1000)
          const mins = ~~(secsFull / 60)
          const secs = secsFull - mins * 60
          tsElem.innerText = `${mins}:${secs < 10 ? 0 : ''}${secs}`
        }, 500)
      }

      const dragArea = doc.querySelector('.drag-area')
      if (dragArea) {
        // TODO: save coordinates on the new page
        attachDND(iframe, dragArea, doc.documentElement)
      }
    })

    //this.toggleVideoUI(false)
    //this.toggleRemoteVideoUI(false)
  }

  private adjustIframeSize() {
    const doc = this.iframe.contentDocument
    if (!doc) { return }
    this.iframe.style.height = `${doc.body.scrollHeight}px`
    this.iframe.style.width = `${doc.body.scrollWidth}px`
  }

  setCallEndAction(endCall: () => void) {
    this.load.then(() => {
      if (this.endCallBtn) {
        this.endCallBtn.onclick = endCall
      }
    }).catch(e => this.logError(e))
  }

  private checkRemoteVideoInterval: ReturnType<typeof setInterval>
  private audioContainer: HTMLDivElement | null = null
  addRemoteStream(rStream: MediaStream) {
    this.load.then(() => {
      // Video
      if (this.vRemote && !this.vRemote.srcObject) {
        this.vRemote.srcObject = rStream
        if (this.vPlaceholder) {
          this.vPlaceholder.innerText = 'Video has been paused. Click anywhere to resume.'
        }
        // Hack to determine if the remote video is enabled 
        // TODO: pass this info through socket
        if (this.checkRemoteVideoInterval) { clearInterval(this.checkRemoteVideoInterval) } // just in case
        let enabled = false
        this.checkRemoteVideoInterval = setInterval(() => {
          const settings = rStream.getVideoTracks()[0]?.getSettings()
          const isDummyVideoTrack = !!settings && (settings.width === 2 || settings.frameRate === 0)
          const shouldBeEnabled = !isDummyVideoTrack
          if (enabled !== shouldBeEnabled) {
            this.toggleRemoteVideoUI(enabled=shouldBeEnabled)
          }
        }, 1000)
      }

      // Audio 
      if (!this.audioContainer) {
        this.audioContainer = document.createElement('div')
        document.body.appendChild(this.audioContainer)
      }
      // Hack for audio. Doesen't work inside the iframe 
      // because of some magical reasons (check if it is connected to autoplay?)
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.style.display = 'none'
      audioEl.srcObject = rStream
      this.audioContainer.appendChild(audioEl)
    }).catch(e => this.logError(e))
  }

  toggleRemoteVideoUI(enable: boolean) {
    this.load.then(() => {
      if (this.videoContainer) {
        if (enable) {
          this.videoContainer.classList.add('remote')
        } else {
          this.videoContainer.classList.remove('remote')
        }
        this.adjustIframeSize()
      }
    }).catch(e => this.logError(e))
  }

  private localStreams: LocalStream[]  = []
  // !TODO: separate  streams manipulation from ui
  setLocalStreams(streams: LocalStream[]) {
    this.localStreams = streams
  }

  playRemote() {
    this.vRemote && this.vRemote.play()
  }

  setAssistentName(callingAgents: Map<string, string>) {
    this.load.then(() => {
      if (this.agentNameElem) {
        const nameString = Array.from(callingAgents.values()).join(', ')
        const safeNames = nameString.length > 20 ? nameString.substring(0, 20) + '...' : nameString
        this.agentNameElem.innerText = safeNames
      }
    }).catch(e => this.logError(e))
  }


  private toggleAudioUI(enabled: boolean) {
    if (!this.audioBtn) { return } 
    if (enabled) {
      this.audioBtn.classList.remove('muted')
    } else {
      this.audioBtn.classList.add('muted')
    }
  }

  private toggleAudio() {
    let enabled = false
    this.localStreams.forEach(stream => {
      enabled = stream.toggleAudio() || false
    })
    this.toggleAudioUI(enabled)
  }

  private toggleVideoUI(enabled: boolean) {
    if (!this.videoBtn || !this.videoContainer) { return }
    if (enabled) {
      this.videoContainer.classList.add('local')
      this.videoBtn.classList.remove('off')
    } else {
      this.videoContainer.classList.remove('local')
      this.videoBtn.classList.add('off')
    }
    this.adjustIframeSize()
  }

  private toggleVideo() {
    this.localStreams.forEach(stream => {
      stream.toggleVideo()
      .then(enabled => {
        this.toggleVideoUI(enabled)
        this.load.then(() => {
          if (this.vLocal && stream && !this.vLocal.srcObject) {
            this.vLocal.srcObject = stream.stream
          }
        }).catch(e => this.logError(e))
      }).catch(e => this.logError(e))
    })
  }

  remove() {
    clearInterval(this.tsInterval)
    clearInterval(this.checkRemoteVideoInterval)
    if (this.audioContainer && this.audioContainer.parentElement) {
      this.audioContainer.parentElement.removeChild(this.audioContainer)
      this.audioContainer = null
    }
    if (this.iframe.parentElement) {
      this.iframe.parentElement.removeChild(this.iframe)
    }
    sessionStorage.removeItem(SS_START_TS_KEY)
    this.localStreams = []
  }

}
