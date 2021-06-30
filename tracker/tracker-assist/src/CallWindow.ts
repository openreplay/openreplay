const defaultView = `
  <style>
    * {
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
    }

    #wrapper {
      display: flex;
      background-color: #333;
    }

    #controls {
      display: flex;
      justify-content: space-around;
      position: fixed;
      bottom: 0;
      left: 0;
      padding-bottom: 8px;
      width: 100%;
    }

    button {
      cursor: pointer;
      border-radius: 50%;
      width: 25px;
      height: 25px;
      position: relative;
      opacity: .5;
      transition: opacity .3s;
    }
    button.white {
      background: white;
    }

    button:hover {
      opacity: 1;
    }

    #soundBtn .bi-mic-mute {
      display:none;
    }
    #soundBtn.muted .bi-mic-mute {
      display: inline-block;
    }
    #soundBtn.muted .bi-mic {
      display:none;
    }

    #videoBtn .bi-camera-video-off {
      display:none;
    }
    #videoBtn.off .bi-camera-video-off {
      display: inline-block;
    }
    #videoBtn.off .bi-camera-video {
      display:none;
    }
    
  </style>
  <div id="wrapper">
    <video id="vLocal" autoplay muted ></video>
    <video id="vRemote" autoplay ></video>

    <div id="controls"> 
      <button id="soundBtn" class="white">
        <svg height="18" width="18" xmlns="http://www.w3.org/2000/svg" class="bi bi-mic" viewBox="0 0 16 16">
          <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
          <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
        </svg>
        <svg height="18" width="18" xmlns="http://www.w3.org/2000/svg" class="bi bi-mic-mute" viewBox="0 0 16 16">
          <path d="M13 8c0 .564-.094 1.107-.266 1.613l-.814-.814A4.02 4.02 0 0 0 12 8V7a.5.5 0 0 1 1 0v1zm-5 4c.818 0 1.578-.245 2.212-.667l.718.719a4.973 4.973 0 0 1-2.43.923V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 1 0v1a4 4 0 0 0 4 4zm3-9v4.879l-1-1V3a2 2 0 0 0-3.997-.118l-.845-.845A3.001 3.001 0 0 1 11 3z"/>
          <path d="m9.486 10.607-.748-.748A2 2 0 0 1 6 8v-.878l-1-1V8a3 3 0 0 0 4.486 2.607zm-7.84-9.253 12 12 .708-.708-12-12-.708.708z"/>
        </svg>
      </button>
      <button id="videoBtn" class="white">
        <svg height="18" width="18" xmlns="http://www.w3.org/2000/svg" class="bi bi-camera-video" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175 3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
        </svg>
        <svg height="18" width="18" xmlns="http://www.w3.org/2000/svg" class="bi bi-camera-video-off" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l.714 1H9.5a1 1 0 0 1 1 1v6a1 1 0 0 1-.144.518l.605.847zM1.428 4.18A.999.999 0 0 0 1 5v6a1 1 0 0 0 1 1h5.014l.714 1H2a2 2 0 0 1-2-2V5c0-.675.334-1.272.847-1.634l.58.814zM15 11.73l-3.5-1.555v-4.35L15 4.269v7.462zm-4.407 3.56-10-14 .814-.58 10 14-.814.58z"/>
        </svg>
      </button>
      <button id="endCallBtn">
        <svg height="25" width="25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" ><g id="Circle_Grid" data-name="Circle Grid"><circle cx="64" cy="64" fill="#ef5261" r="64"/></g><g id="icon"><path d="m57.831 70.1c8.79 8.79 17.405 12.356 20.508 9.253l4.261-4.26a7.516 7.516 0 0 1 10.629 0l9.566 9.566a7.516 7.516 0 0 1 0 10.629l-7.453 7.453c-7.042 7.042-27.87-2.358-47.832-22.319-9.976-9.981-16.519-19.382-20.748-28.222s-5.086-16.091-1.567-19.61l7.453-7.453a7.516 7.516 0 0 1 10.629 0l9.566 9.563a7.516 7.516 0 0 1 0 10.629l-4.264 4.271c-3.103 3.1.462 11.714 9.252 20.5z" fill="#eeefee"/></g></svg>
      </button>
    </div>
  </div>
`

const V_WIDTH = 160;
const V_HEIGHT = 120;

export default class CallWindow {
  private iframe: HTMLIFrameElement;
  private vRemote: HTMLVideoElement | null = null;
  private vLocal: HTMLVideoElement | null = null;
  private soundBtn: HTMLButtonElement | null = null;
  private videoBtn: HTMLButtonElement | null = null;
  constructor(endCall: () => void) {
    this.iframe = document.createElement('iframe');
    Object.assign(this.iframe.style, {
      position: "absolute",
      zIndex: "999999",
      width: `${2*V_WIDTH}px`,
      height: `${V_HEIGHT}px`,
      borderRadius: ".25em .25em .4em .4em",
      border: "4px rgba(0, 0, 0, .7)",
      top: `calc(100% - ${V_HEIGHT + 20}px)`,
      left: `calc(100% - ${2*V_WIDTH + 20}px)`,
    });
    document.body.appendChild(this.iframe);

    const doc = this.iframe.contentDocument
    if (!doc) {
      console.error("OpenReplay: CallWindow iframe document is not reachable.")
      return; 
    }

    doc.body.innerHTML = defaultView;

    this.vLocal = doc.getElementById("vLocal") as HTMLVideoElement;
    this.vLocal.height = V_HEIGHT
    this.vLocal.width = V_WIDTH
    this.vRemote = doc.getElementById("vRemote") as HTMLVideoElement;
    this.vRemote.height = V_HEIGHT
    this.vRemote.width = V_WIDTH

    const endCallBtn = doc.getElementById("endCallBtn") as HTMLButtonElement;
    endCallBtn.onclick = endCall;
        
    this.soundBtn = doc.getElementById("soundBtn") as HTMLButtonElement;
    this.soundBtn.onclick = () => this.toggleAudio();

    this.videoBtn = doc.getElementById("videoBtn") as HTMLButtonElement;
    this.videoBtn.onclick = () => this.toggleVideo();



    // TODO: better D'n'D 
    doc.body.setAttribute("draggable", "true");
    doc.body.ondragstart = (e) => {
      if (!e.dataTransfer || !e.target) { return; }
      e.dataTransfer.setDragImage(doc.body, e.clientX, e.clientY);
    };
    doc.body.ondragend = e => {
      Object.assign(this.iframe.style, {
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
      })
    }

  }

  private outputStream: MediaStream | null = null;
  setInputStream(iStream: MediaStream) {
    if (!this.vRemote) { return; }
    this.vRemote.srcObject = iStream;
  }
  setOutputStream(oStream: MediaStream) {
    if (!this.vLocal) { return; }
    this.outputStream = oStream;
    this.vLocal.srcObject = oStream;
  }

  toggleAudio() {
    let enabled = true;
    this.outputStream?.getAudioTracks().forEach(track => {
      enabled = enabled && !track.enabled;
      track.enabled = enabled;
    });
    if (enabled) {
      this.soundBtn?.classList.remove("muted");
    } else {
      this.soundBtn?.classList.add("muted");
    }
  }
  toggleVideo() {
    let enabled = true;
    this.outputStream?.getVideoTracks().forEach(track => {
      enabled = enabled && !track.enabled;
      track.enabled = enabled;
    });
    if (enabled) {
      this.videoBtn?.classList.remove("off");
    } else {
      this.videoBtn?.classList.add("off");
    }
  }

  remove() {
    if (this.iframe.parentElement) {
      document.body.removeChild(this.iframe);   
    }
  }

}