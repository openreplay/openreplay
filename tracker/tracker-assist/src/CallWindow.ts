import type { LocalStream } from './LocalStream.js';

const SS_START_TS_KEY = "__openreplay_assist_call_start_ts"

export default class CallWindow {
  private iframe: HTMLIFrameElement
  private vRemote: HTMLVideoElement | null = null
  private vLocal: HTMLVideoElement | null = null
  private audioBtn: HTMLElement | null = null
  private videoBtn: HTMLElement | null = null
  private endCallBtn: HTMLElement | null = null
  private agentNameElem: HTMLElement | null = null
  private videoContainer: HTMLElement | null = null
  private vPlaceholder: HTMLElement | null = null

  private tsInterval: ReturnType<typeof setInterval>

  private load: Promise<void>

  constructor() {
    const iframe = this.iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: "fixed",
      zIndex: 2147483647 - 1,
      //borderRadius: ".25em .25em .4em .4em",
      //border: "4px rgba(0, 0, 0, .7)",
      border: "none",
      bottom: "10px",
      right: "10px",
      background: "white",
      height: "200px",
      width: "200px",
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      console.error("OpenReplay: CallWindow iframe document is not reachable.")
      return; 
    }


    //const baseHref = "https://static.openreplay.com/tracker-assist/test"
    const baseHref = "https://static.openreplay.com/tracker-assist/3.4.4"
    this.load = fetch(baseHref + "/index.html")
    .then(r => r.text())
    .then((text) => {
      iframe.onload = () => {
        const assistSection = doc.getElementById("or-assist")
        assistSection?.classList.remove("status-connecting")
        //iframe.style.height = doc.body.scrollHeight + 'px';
        //iframe.style.width = doc.body.scrollWidth + 'px';
        this.adjustIframeSize()
        iframe.onload = null;
      }

      // ?
      text = text.replace(/href="css/g, `href="${baseHref}/css`)
      doc.open();
      doc.write(text);
      doc.close();

      
      this.vLocal = doc.getElementById("video-local") as (HTMLVideoElement | null);
      this.vRemote = doc.getElementById("video-remote") as (HTMLVideoElement | null);
      this.videoContainer = doc.getElementById("video-container");
      
      this.audioBtn = doc.getElementById("audio-btn");
      if (this.audioBtn) {
        this.audioBtn.onclick = () => this.toggleAudio();
      }
      this.videoBtn = doc.getElementById("video-btn");
      if (this.videoBtn) {
        this.videoBtn.onclick = () => this.toggleVideo();
      }
      this.endCallBtn = doc.getElementById("end-call-btn");

      this.agentNameElem = doc.getElementById("agent-name");
      this.vPlaceholder = doc.querySelector("#remote-stream p")

      const tsElem = doc.getElementById("duration");
      if (tsElem) {
        const startTs = Number(sessionStorage.getItem(SS_START_TS_KEY)) || Date.now()
        sessionStorage.setItem(SS_START_TS_KEY, startTs.toString())
        this.tsInterval = setInterval(() => {
          const ellapsed = Date.now() - startTs
          const secsFull = ~~(ellapsed / 1000)
          const mins = ~~(secsFull / 60)
          const secs = secsFull - mins * 60
          tsElem.innerText = `${mins}:${secs < 10 ? 0 : ''}${secs}`
        }, 500);
      }

      // TODO: better D'n'D 
      // mb set cursor:move here?
      doc.body.setAttribute("draggable", "true");
      doc.body.ondragstart = (e) => {
        if (!e.dataTransfer || !e.target) { return; }
        //@ts-ignore
        if (!e.target.classList || !e.target.classList.contains("drag-area")) { return; }
        e.dataTransfer.setDragImage(doc.body, e.clientX, e.clientY);
      };
      doc.body.ondragend = e => {
        Object.assign(iframe.style, {
          left: `${e.clientX}px`, // TODO: fix the case when ecoordinates are inside the iframe
          top: `${e.clientY}px`,
          bottom: 'auto',
          right: 'auto',
        })
      }
    });

    //this.toggleVideoUI(false)
    //this.toggleRemoteVideoUI(false)
  }

  private adjustIframeSize() {
    const doc = this.iframe.contentDocument
    if (!doc) { return }
    this.iframe.style.height = doc.body.scrollHeight + 'px';
    this.iframe.style.width = doc.body.scrollWidth + 'px';
  }

  setCallEndAction(endCall: () => void) {
    this.load.then(() => {
      if (this.endCallBtn) {
        this.endCallBtn.onclick = endCall
      }
    })
  }

  private aRemote: HTMLAudioElement | null = null;
  private checkRemoteVideoInterval: ReturnType<typeof setInterval>
  setRemoteStream(rStream: MediaStream) {
    this.load.then(() => {
      if (this.vRemote && !this.vRemote.srcObject) {
        this.vRemote.srcObject = rStream;
        if (this.vPlaceholder) {
          this.vPlaceholder.innerText = "Video has been paused. Click anywhere to resume.";
        }

        // Hack for audio. Doesen't work inside the iframe because of some magical reasons (check if it is connected to autoplay?)
        this.aRemote = document.createElement("audio");
        this.aRemote.autoplay = true;
        this.aRemote.style.display = "none"
        this.aRemote.srcObject = rStream;
        document.body.appendChild(this.aRemote)
      }

      // Hack to determine if the remote video is enabled
      if (this.checkRemoteVideoInterval) { clearInterval(this.checkRemoteVideoInterval) } // just in case
      let enabled = false
      this.checkRemoteVideoInterval = setInterval(() => {
        const settings = rStream.getVideoTracks()[0]?.getSettings()
        //console.log(settings)
        const isDummyVideoTrack = !!settings && (settings.width === 2 || settings.frameRate === 0)
        const shouldBeEnabled = !isDummyVideoTrack
        if (enabled !== shouldBeEnabled) {
          this.toggleRemoteVideoUI(enabled=shouldBeEnabled)
        }
      }, 1000)
    })
  }

  toggleRemoteVideoUI(enable: boolean) {
    this.load.then(() => {
      if (this.videoContainer) {
        if (enable) {
          this.videoContainer.classList.add("remote")
        } else {
          this.videoContainer.classList.remove("remote")
        }
        this.adjustIframeSize()
      }
    })
  }

  private localStream: LocalStream | null = null;

  // TODO: on construction?
  setLocalStream(lStream: LocalStream) {
    this.localStream = lStream
  }

  playRemote() {
    this.vRemote && this.vRemote.play()
  }

  setAssistentName(name: string) {
    this.load.then(() => {
      if (this.agentNameElem) {
        this.agentNameElem.innerText = name
      }
    })
  }


  private toggleAudioUI(enabled: boolean) {
    if (!this.audioBtn) { return; } 
    if (enabled) {
      this.audioBtn.classList.remove("muted")
    } else {
      this.audioBtn.classList.add("muted")
    }
  }

  private toggleAudio() {
    const enabled = this.localStream?.toggleAudio() || false
    this.toggleAudioUI(enabled)
  }

  private toggleVideoUI(enabled: boolean) {
    if (!this.videoBtn || !this.videoContainer) { return; }
    if (enabled) {
      this.videoContainer.classList.add("local")
      this.videoBtn.classList.remove("off");
    } else {
      this.videoContainer.classList.remove("local")
      this.videoBtn.classList.add("off");
    }
    this.adjustIframeSize()
  }

  private videoRequested: boolean = false
  private toggleVideo() {
    this.localStream?.toggleVideo()
    .then(enabled => {
      this.toggleVideoUI(enabled)
      this.load.then(() => {
        if (this.vLocal && this.localStream && !this.vLocal.srcObject) {
          this.vLocal.srcObject = this.localStream.stream
        }
      })
    })
  }

  remove() {
    this.localStream?.stop()
    clearInterval(this.tsInterval)
    clearInterval(this.checkRemoteVideoInterval)
    if (this.iframe.parentElement) {
      document.body.removeChild(this.iframe)
    }
    if (this.aRemote && this.aRemote.parentElement) {
      document.body.removeChild(this.aRemote)
    }
    sessionStorage.removeItem(SS_START_TS_KEY)
  }

}