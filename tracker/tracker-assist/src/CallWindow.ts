

export default class CallWindow {
  private iframe: HTMLIFrameElement;
  private vRemote: HTMLVideoElement | null = null;
  private vLocal: HTMLVideoElement | null = null;
  private audioBtn: HTMLAnchorElement | null = null;
  private videoBtn: HTMLAnchorElement | null = null;

  private tsInterval: ReturnType<typeof setInterval>;
  constructor(endCall: () => void) {
    const iframe = this.iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: "absolute",
      zIndex: 2147483647 - 1,
      //borderRadius: ".25em .25em .4em .4em",
      //border: "4px rgba(0, 0, 0, .7)",
      border: "none",
      bottom: "10px",
      right: "10px",
    });
    //iframe.src = "//static.openreplay.com/tracker-assist/index.html";
    iframe.onload = () => {
      const doc = iframe.contentDocument;
      if (!doc) {
        console.error("OpenReplay: CallWindow iframe document is not reachable.")
        return; 
      }
      fetch("https://static.openreplay.com/tracker-assist/index.html")
      //fetch("file:///Users/shikhu/work/asayer-tester/dist/assist/index.html")
      .then(r => r.text())
      .then((text) => {
        iframe.onload = () => {
          iframe.style.height = doc.body.scrollHeight + 'px';
          iframe.style.width = doc.body.scrollWidth + 'px';
        }

        text = text.replace(/href="css/g, "href=\"https://static.openreplay.com/tracker-assist/css")
        doc.open();
        doc.write(text);
        doc.close();

        
        this.vLocal = doc.getElementById("video-local") as HTMLVideoElement;
        this.vRemote = doc.getElementById("video-remote") as HTMLVideoElement;
        this._trySetStreams();
        this.vLocal.parentElement && this.vLocal.parentElement.classList.add("d-none");

        this.audioBtn = doc.getElementById("audio-btn") as HTMLAnchorElement;
        this.audioBtn.onclick = () => this.toggleAudio();
        this.videoBtn = doc.getElementById("video-btn") as HTMLAnchorElement;
        this.videoBtn.onclick = () => this.toggleVideo();

        const endCallBtn = doc.getElementById("end-call-btn") as HTMLAnchorElement;
        endCallBtn.onclick = endCall;

        const tsText = doc.getElementById("time-stamp");
        const startTs = Date.now();
        if (tsText) {
          this.tsInterval = setInterval(() => {
            const ellapsed = Date.now() - startTs;
            const secsFull = ~~(ellapsed / 1000);
            const mins = ~~(secsFull / 60);
            const secs = secsFull - mins * 60
            tsText.innerText = `${mins}:${secs < 10 ? 0 : ''}${secs}`;
          }, 500);
        }

            // TODO: better D'n'D 
        doc.body.setAttribute("draggable", "true");
        doc.body.ondragstart = (e) => {
          if (!e.dataTransfer || !e.target) { return; }
          e.dataTransfer.setDragImage(doc.body, e.clientX, e.clientY);
        };
        doc.body.ondragend = e => {
          Object.assign(iframe.style, {
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
            bottom: 'auto',
            right: 'auto',
          })
        }
      });
    }

    document.body.appendChild(iframe);

  }

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private _trySetStreams() {
    if (this.vRemote && this.remoteStream) {
      this.vRemote.srcObject = this.remoteStream;
    }
    if (this.vLocal && this.localStream) {
      this.vLocal.srcObject = this.localStream;
    }
  }
  setRemoteStream(rStream: MediaStream) {
    this.remoteStream = rStream;
    this._trySetStreams();
  }
  setLocalStream(lStream: MediaStream) {    
    this.localStream = lStream;
    lStream.getVideoTracks().forEach(track => {
      track.enabled = false;
    });
    this._trySetStreams();
  }

  toggleAudio() {
    let enabled = true;
    this.localStream?.getAudioTracks().forEach(track => {
      enabled = enabled && !track.enabled;
      track.enabled = enabled;
    });
    const cList = this.audioBtn?.classList;
    if (!this.audioBtn) { return; } 
    if (enabled) {
      this.audioBtn.classList.remove("muted");
      this.audioBtn.childNodes[1].textContent = "Mute";
    } else {
      this.audioBtn.classList.add("muted");
      this.audioBtn.childNodes[1].textContent = "Unmute";
    }
  }
  toggleVideo() {
    let enabled = true;
    this.localStream?.getVideoTracks().forEach(track => {
      enabled = enabled && !track.enabled;
      track.enabled = enabled;
    });
    if (!this.videoBtn || !this.vLocal || !this.vLocal.parentElement) { return; } 
    if (enabled) {
      this.vLocal.parentElement.classList.remove("d-none");
      this.videoBtn.classList.remove("off");
      this.videoBtn.childNodes[1].textContent = "Stop Video";
    } else {
      this.vLocal.parentElement.classList.add("d-none");
      this.videoBtn.classList.add("off");
      this.videoBtn.childNodes[1].textContent = "Start Video";
    }
  }

  remove() {
    clearInterval(this.tsInterval);
    if (this.iframe.parentElement) {
      document.body.removeChild(this.iframe);   
    }
  }

}