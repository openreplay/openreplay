export default class CallWindow {
  private wrapper: HTMLDivElement;
  private inputV: HTMLVideoElement;
  private outputV: HTMLVideoElement;
  constructor(endCall: () => void) {
    this.wrapper = document.createElement('div');
    this.wrapper.style.position = "absolute"
    this.wrapper.style.zIndex = "999999";
    this.outputV = document.createElement('video');
    this.outputV.height = 120
    this.outputV.width = 160
    this.outputV.autoplay = true
    this.outputV.muted = true
    this.inputV = document.createElement('video');
    this.inputV.height = 120
    this.inputV.width = 160
    this.inputV.autoplay = true
    this.wrapper.appendChild(this.outputV);
    this.wrapper.appendChild(this.inputV);

    const endCallBtn = document.createElement('button');
    endCallBtn.onclick = endCall;
    this.wrapper.appendChild(endCallBtn);
    
    const soundBtn = document.createElement('button');
    soundBtn.onclick = () => this.toggleAudio();
    this.wrapper.appendChild(soundBtn);

    const videoButton = document.createElement('button');
    videoButton.onclick = () => this.toggleVideo();
    this.wrapper.appendChild(videoButton);
    
    document.body.appendChild(this.wrapper);
    
  }

  private outputStream: MediaStream | null = null;
  setInputStream(iStream: MediaStream) {
    this.inputV.srcObject = iStream;
  }
  setOutputStream(oStream: MediaStream) {
    this.outputStream = oStream;
    this.outputV.srcObject = oStream;
  }

  toggleAudio(flag?: boolean) {
    this.outputStream?.getAudioTracks().forEach(track => {
      track.enabled = typeof flag === 'boolean' ? flag : !track.enabled;;
    });
  }
  toggleVideo(flag?: boolean) {
    this.outputStream?.getVideoTracks().forEach(track => {
      track.enabled = typeof flag === 'boolean' ? flag : !track.enabled;;
    });
  }

  remove() {
    document.body.removeChild(this.wrapper);   
  }

}