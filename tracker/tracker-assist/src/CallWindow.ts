import type { LocalStream, } from './LocalStream.js'
import attachDND from './dnd.js'

const SS_START_TS_KEY = '__openreplay_assist_call_start_ts'

const text = `
<!doctype html>
<html lang="en">

<head>
  <!-- Required meta tags -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenReplay | Assist</title>

  <!--CSS -->
  <!-- <link href="css/styles.css" rel="stylesheet"> -->
  <style>
    .connecting-message {
      margin-top: 50%;
      font-size: 20px;
      color: #aaa;
      text-align: center;
      display: none;
      font-family: sans-serif;
    }

    .status-connecting .connecting-message {
      display: block;
    }

    .status-connecting .card {
      display: none;
    }

    .card {
      min-width: 324px;
      width: 350px;
      max-width: 800px;
      cursor: move;
    }

    #agent-name,
    #duration {
      cursor: default;
    }

    #local-stream,
    #remote-stream {
      display: none;
    }

	#video-container {
	  display: flex;
	  flex-direction: row;
	  position: relative;
	}

	#video-container {
	  display: none;
	  flex-direction: row;
	  position: relative;
	}

	[data-attr="remote-stream"] {
	  flex: 1;
	}

	[data-attr="remote-stream"] video {
	  aspect-ratio: 4 / 3;
	  width: 100%;
	}

    #video-container.remote {
      display: flex;
    }

    #video-container.local {
      min-height: 100px;
    }

    #video-container.local #local-stream {
      display: block;
    }

    #local-stream {
      width: 35%;
      position: absolute;
      z-index: 99;
      bottom: 5px;
      right: 5px;
    }


    #audio-btn .bi-mic-mute {
      display: none;
    }

    #audio-btn, #video-btn {
      color: #cc0000;
    }

    #audio-btn:after {
      text-transform: capitalize;
      content: 'Mute'
    }

    #audio-btn.muted, #video-btn.off {
      color: #888;
    }

    #audio-btn.muted .bi-mic-mute {
      display: inline-block;
    }

    #audio-btn.muted .bi-mic {
      display: none;
    }

    #audio-btn.muted:after {
      content: 'Unmute'
    }


    #video-btn .bi-camera-video-off {
      display: none;
    }

    #video-btn:after {
      text-transform: capitalize;
      content: 'Stop Video'
    }

    #video-btn.off:after {
      content: 'Start Video'
    }

    #video-btn.off .bi-camera-video-off {
      display: inline-block;
    }

    #video-btn.off .bi-camera-video {
      display: none;
    }

    .remote-control {
      display: none;
      justify-content: space-between;
      flex-direction: row;
      align-items: center;
      padding: 8px 16px;
    }

    #title-span {
      font-weight: 500;
    }

  </style>

  <link href="css/bootstrap.min.css" rel="stylesheet">
</head>


<body>
  <section id="or-assist" class="status-connecting">
    <div class="card border-dark shadow drag-area">
    <div class="connecting-message"> Connecting... </div>
    <div id="controls">
      <div class="card-header d-flex justify-content-between">
        <div class="user-info">
          <span id="title-span">Call with</span>
          <!-- User Name -->
          <span id="agent-name" class="person-name fw-light">Support Agent</span>
        </div>
        <div class="call-duration">
          <!--Call Duration. -->
          <span id="duration" class="card-subtitle mb-2 text-muted fw-light" data-bs-toggle="tooltip"
            data-bs-placement="bottom" title="Duration">00:00</span>
        </div>
      </div>
      <div id="video-container" class="card-body bg-dark p-0 d-flex align-items-center position-relative">
        <div id="local-stream" class="ratio ratio-4x3 rounded m-0 p-0 shadow scale-x-[-1]">
          <!-- fix horizontal mirroring -->
          <video id="video-local" autoplay muted class="scale-x-[-1]"></video>
        </div>

        <div data-attr="remote-stream" class="m-0 p-0">
        </div>
      </div>

      <div class="card-footer bg-transparent d-flex justify-content-between">
        <div class="assist-controls">
          <a href="#" id="audio-btn" class="btn btn-light btn-sm text-uppercase me-2"><i>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-mic"
                viewBox="0 0 16 16">
                <path
                  d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z" />
                <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-mic-mute"
                viewBox="0 0 16 16">
                <path
                  d="M13 8c0 .564-.094 1.107-.266 1.613l-.814-.814A4.02 4.02 0 0 0 12 8V7a.5.5 0 0 1 1 0v1zm-5 4c.818 0 1.578-.245 2.212-.667l.718.719a4.973 4.973 0 0 1-2.43.923V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 1 0v1a4 4 0 0 0 4 4zm3-9v4.879l-1-1V3a2 2 0 0 0-3.997-.118l-.845-.845A3.001 3.001 0 0 1 11 3z" />
                <path
                  d="m9.486 10.607-.748-.748A2 2 0 0 1 6 8v-.878l-1-1V8a3 3 0 0 0 4.486 2.607zm-7.84-9.253 12 12 .708-.708-12-12-.708.708z" />
              </svg>

            </i></a>
          <!-- Add class .mute to #audio-btn when user  mutes audio -->
          <a href="#" id="video-btn" class="off btn btn-light btn-sm text-uppercase ms-2"><i>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-camera-video" viewBox="0 0 16 16">
                <path fill-rule="evenodd"
                  d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175 3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-camera-video-off" viewBox="0 0 16 16">
                <path fill-rule="evenodd"
                  d="M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l.714 1H9.5a1 1 0 0 1 1 1v6a1 1 0 0 1-.144.518l.605.847zM1.428 4.18A.999.999 0 0 0 1 5v6a1 1 0 0 0 1 1h5.014l.714 1H2a2 2 0 0 1-2-2V5c0-.675.334-1.272.847-1.634l.58.814zM15 11.73l-3.5-1.555v-4.35L15 4.269v7.462zm-4.407 3.56-10-14 .814-.58 10 14-.814.58z" />
              </svg>

            </i></a>
          <!--Add class .off to #video-btn when user stops video -->
        </div>
        <div class="assist-end">
          <a id="end-call-btn" style="min-width:55px;" href="#" class="btn btn-danger btn-sm  text-uppercase">End</a>
        </div>
      </div>
    </div>
    <div id="remote-control-row" class="remote-control">
      <div style="font-size: 13px;">This tab has remote control access</div>
      <button style="min-width:55px;" id="end-control-btn" href="#" class="btn btn-outline-primary btn-sm text-uppercase">
        Stop
      </button>
    </div>
  </div>
  </section>
</body>

</html>
`

export default class CallWindow {
	private readonly iframe: HTMLIFrameElement
	private vRemote: Map<string, HTMLVideoElement | null> = new Map()
	private vLocal: HTMLVideoElement | null = null
	private audioBtn: HTMLElement | null = null
	private videoBtn: HTMLElement | null = null
	private endCallBtn: HTMLElement | null = null
	private agentNameElem: HTMLElement | null = null
	private remoteStreamVideoContainerSample: HTMLElement | null = null
	private videoContainer: HTMLElement | null = null
	private vPlaceholder: HTMLElement | null = null
	private remoteControlContainer: HTMLElement | null = null
	private remoteControlEndBtn: HTMLElement | null = null
	private controlsContainer: HTMLElement | null = null
	private onToggleVideo: (args: any) => void
	private tsInterval: ReturnType<typeof setInterval>
	private remoteVideos: Map<string, MediaStreamTrack> = new Map()
	private vContainer: HTMLDivElement | null = null

	private readonly load: Promise<void>

	constructor(private readonly logError: (...args: any[]) => void, private readonly callUITemplate?: string) {
		const iframe = (this.iframe = document.createElement('iframe'))
		Object.assign(iframe.style, {
			position: 'fixed',
			zIndex: 2147483647 - 1,
			border: 'none',
			bottom: '50px',
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
			logError('OpenReplay: CallWindow iframe document is not reachable.')
			return
		}

		// const baseHref = "https://static.openreplay.com/tracker-assist/test"
		const baseHref = 'https://static.openreplay.com/tracker-assist/4.0.0'
		// this.load = fetch(this.callUITemplate || baseHref + '/index2.html')
		this.load = fetch(this.callUITemplate || baseHref + '/index.html')
			.then((r) => r.text())
			.then(() => {
				iframe.onload = () => {
					const assistSection = doc.getElementById('or-assist')
					setTimeout(() => {
						assistSection?.classList.remove('status-connecting')
					}, 0)
					//iframe.style.height = doc.body.scrollHeight + 'px';
					//iframe.style.width = doc.body.scrollWidth + 'px';
					this.adjustIframeSize()
					iframe.onload = null
				}
				// ?
				const newText = text.replace(/href="css/g, `href="${baseHref}/css`)
				doc.open()
				doc.write(newText)
				doc.close()

				this.vLocal = doc.getElementById('video-local') as HTMLVideoElement | null
				// this.vRemote = doc.getElementById('video-remote') as HTMLVideoElement | null
				this.remoteStreamVideoContainerSample = doc.querySelector('[data-attr="remote-stream"]');
				this.remoteStreamVideoContainerSample?.remove();
				
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

				this.remoteControlContainer = doc.getElementById('remote-control-row')
				this.remoteControlEndBtn = doc.getElementById('end-control-btn')
				this.controlsContainer = doc.getElementById('controls')
				if (this.controlsContainer) {
					this.controlsContainer.style.display = 'none'
				}

				const tsElem = doc.getElementById('duration')
				if (tsElem) {
					const startTs =
						Number(sessionStorage.getItem(SS_START_TS_KEY)) || Date.now()
					sessionStorage.setItem(SS_START_TS_KEY, startTs.toString())
					this.tsInterval = setInterval(() => {
						const ellapsed = Date.now() - startTs
						const secsFull = ~~(ellapsed / 1000)
						const mins = ~~(secsFull / 60)
						const secs = secsFull - mins * 60
						tsElem.innerText = `${mins > 0 ? `${mins}m` : ''}${secs < 10 ? 0 : ''}${secs}s`
					}, 500)
				}

				const dragArea = doc.querySelector('.drag-area')
				if (dragArea) {
					// TODO: save coordinates on the new page
					attachDND(iframe, dragArea, doc.documentElement)
				}
				setTimeout(() => {
					const assistSection = doc.getElementById('or-assist')
					assistSection?.classList.remove('status-connecting')
					this.adjustIframeSize()
				}, 250)
			})

		//this.toggleVideoUI(false)
		//this.toggleRemoteVideoUI(false)
	}

	private adjustIframeSize() {
		const doc = this.iframe.contentDocument
		if (!doc) {
			return
		}
		this.iframe.style.height = `${doc.body.scrollHeight}px`
		this.iframe.style.width = `${doc.body.scrollWidth}px`
	}

	private checkRemoteVideoInterval: ReturnType<typeof setInterval>
	private audioContainer: HTMLDivElement | null = null
	addRemoteStream(rStream: MediaStream, peerId: string) {
		this.load
			.then(() => {
				// Video
				console.log('VREMOTE', this.vRemote);
				if (!this.vRemote.has(peerId)) {
					if (this.remoteStreamVideoContainerSample && this.videoContainer) {
						const newRemoteStreamVideoContainer = this.remoteStreamVideoContainerSample.cloneNode(true) as HTMLDivElement;
						newRemoteStreamVideoContainer.setAttribute("data-peer-id", peerId);

						const videoElement = document.createElement("video");
						videoElement.autoplay = true;
						newRemoteStreamVideoContainer.appendChild(videoElement);
						const clonedStream = rStream.clone()
						videoElement.srcObject = clonedStream

						const videoElementTest = document.createElement("video");
						videoElementTest.autoplay = true;
						videoElementTest.srcObject = clonedStream;
						videoElementTest.setAttribute("data-peer-id", peerId);
						document.body.appendChild(videoElementTest);
						
						this.remoteVideos.set(peerId, clonedStream.getVideoTracks()[0])
						console.log("ADD REMOTE STREAM", clonedStream.getVideoTracks()[0]);
						if (this.vPlaceholder) {
							this.vPlaceholder.innerText =
								'Video has been paused. Click anywhere to resume.'
						}
						this.vRemote.set(peerId, videoElement)
						this.videoContainer.appendChild(newRemoteStreamVideoContainer);
						console.log('ДОБАВИЛИ ВИДЕО В ДОМ для', peerId);
					}
				}

				// Hack to determine if the remote video is enabled
				// TODO: pass this info through socket
				if (this.checkRemoteVideoInterval) {
					clearInterval(this.checkRemoteVideoInterval)
				} // just in case
				let enabled = false
				this.checkRemoteVideoInterval = setInterval(() => {
					const settings = this.remoteVideos.get(peerId)?.getSettings()
					const isDummyVideoTrack = !this.remoteVideos.get(peerId)?.enabled || (!!settings && (settings.width === 2 || settings.frameRate === 0))
					const shouldBeEnabled = !isDummyVideoTrack
					if (enabled !== shouldBeEnabled) {
						this.toggleRemoteVideoUI((enabled = shouldBeEnabled))
					}
				}, 1000)
				

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
			})
			.catch((e) => this.logError(e))
	}

	toggleRemoteVideoUI(enable: boolean) {
		this.load
			.then(() => {
				if (this.videoContainer) {
					if (enable) {
						this.videoContainer.classList.add('remote')
					} else {
						this.videoContainer.classList.remove('remote')
					}
					this.adjustIframeSize()
				}
			})
			.catch((e) => this.logError(e))
	}

	private localStreams: LocalStream[] = []
	// !TODO: separate  streams manipulation from ui
	setLocalStreams(streams: LocalStream[]) {
		this.localStreams = streams
	}

	playRemote(peerId: string) {
		if (this.vRemote.has(peerId)) {
			const vRemote = this.vRemote.get(peerId)
			if (vRemote) {
				vRemote.play()
			}
		}
	}

	setAssistentName(callingAgents: Map<string, string>) {
		this.load
			.then(() => {
				if (this.agentNameElem) {
					const nameString = Array.from(callingAgents.values()).join(', ')
					const safeNames =
						nameString.length > 20 ? nameString.substring(0, 20) + '...' : nameString
					this.agentNameElem.innerText = safeNames
				}
			})
			.catch((e) => this.logError(e))
	}

	private toggleAudioUI(enabled: boolean) {
		if (!this.audioBtn) {
			return
		}
		if (enabled) {
			this.audioBtn.classList.remove('muted')
		} else {
			this.audioBtn.classList.add('muted')
		}
	}

	private toggleAudio() {
		let enabled = false
		this.localStreams.forEach((stream) => {
			enabled = stream.toggleAudio() || false
		})
		this.toggleAudioUI(enabled)
	}

	private toggleVideoUI(enabled: boolean) {
		if (!this.videoBtn || !this.videoContainer) {
			return
		}
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
		this.localStreams.forEach((stream) => {
			stream
				.toggleVideo()
				.then((enabled) => {
					this.onToggleVideo?.({ streamId: stream.stream.id, enabled, })
					this.toggleVideoUI(enabled)
					this.load
						.then(() => {
							if (this.vLocal && stream && !this.vLocal.srcObject) {
								this.vLocal.srcObject = stream.stream
							}
						})
						.catch((e) => this.logError(e))
				})
				.catch((e) => this.logError(e))
		})
	}

	public showRemoteControl(endControl: () => void) {
		this.load
			.then(() => {
				if (this.remoteControlContainer) {
					this.remoteControlContainer.style.display = 'flex'
				}
				if (this.remoteControlEndBtn) {
					this.remoteControlEndBtn.onclick = endControl
				}
				this.adjustIframeSize()
			})
			.catch((e) => this.logError(e))
	}

	public showControls(endCall: () => void) {
		this.load
			.then(() => {
				if (this.controlsContainer) {
					this.controlsContainer.style.display = 'unset'
				}
				if (this.endCallBtn) {
					this.endCallBtn.onclick = endCall
				}
				this.adjustIframeSize()
			})
			.catch((e) => this.logError(e))
	}

	public hideControls() {
		if (this.controlsContainer) {
			this.controlsContainer.style.display = 'none'
		}
		this.adjustIframeSize()
	}

	public hideRemoteControl() {
		if (this.remoteControlContainer) {
			this.remoteControlContainer.style.display = 'none'
		}
		this.adjustIframeSize()
	}

	public setVideoToggleCallback(cb) {
		this.onToggleVideo = cb
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

	toggleVideoStream({ streamId, enabled, }: { streamId: string, enabled: boolean }) {
		if (this.remoteVideos.has(streamId)) {
			console.log("TRYING TO ENABLE", this.remoteVideos.get[streamId])
			const track = this.remoteVideos.get(streamId)
			if (track) {
				console.log('ENABLING TRACK', track);
				track.enabled = enabled
			}
			if (this.vRemote.size <= 1) {
				this.toggleRemoteVideoUI(enabled)
			}
		}
	}
}
