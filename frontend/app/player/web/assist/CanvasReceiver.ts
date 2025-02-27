import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import MessageManager from 'Player/web/MessageManager';
import { Socket } from 'socket.io-client';

let frameCounter = 0;

function draw(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  canvasCtx: CanvasRenderingContext2D
) {
  if (frameCounter % 4 === 0) {
    canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
  frameCounter++;
  requestAnimationFrame(() => draw(video, canvas, canvasCtx));
}

export default class CanvasReceiver {
  private streams: Map<string, MediaStream> = new Map();
  // Store RTCPeerConnection for each remote peer
  private connections: Map<string, RTCPeerConnection> = new Map();
  private cId: string;

  // sendSignal – for sending signals (offer/answer/ICE)
  constructor(
    private readonly peerIdPrefix: string,
    private readonly config: RTCIceServer[] | null,
    private readonly getNode: MessageManager['getNode'],
    private readonly agentInfo: Record<string, any>,
    private readonly socket: Socket,
  ) {
    // Form an id like in PeerJS
    this.cId = `${this.peerIdPrefix}-${this.agentInfo.id}-canvas`;

    this.socket.on('webrtc_canvas_offer', (data: { data: { offer: RTCSessionDescriptionInit, id: string }}) => {
      const { offer, id } = data.data;
      if (checkId(id, this.cId)) {
        this.handleOffer(offer, id);
      }
    });
    
    this.socket.on('webrtc_canvas_ice_candidate', (data: { data: { candidate: RTCIceCandidateInit, id: string }}) => {
      const {candidate, id } = data.data;
      if (checkId(id, this.cId)) {
        this.handleCandidate(candidate, id);
      }
    });

    this.socket.on('webrtc_canvas_restart', () => {
      this.clear();
    });
  }

  async handleOffer(offer: RTCSessionDescriptionInit, id: string): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: this.config ? this.config : [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Save the connection
    this.connections.set(id, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_canvas_ice_candidate', ({ candidate: event.candidate, id }));
      }
    };

    pc.ontrack = (event) => {

      const stream = event.streams[0];
      if (stream) {
        // Detect canvasId from remote peer id
        const canvasId = id.split('-')[4];
        this.streams.set(canvasId, stream);
        setTimeout(() => {
          const node = this.getNode(parseInt(canvasId, 10));
          const videoEl = spawnVideo(stream.clone() as MediaStream, node as VElement);
          if (node) {
            draw(
              videoEl,
              node.node as HTMLCanvasElement,
              (node.node as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D
            );
          } else {
            console.log('NODE', canvasId, 'IS NOT FOUND');
          }
        }, 250);
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc_canvas_answer', { answer: answer, id });
  }

  async handleCandidate(candidate: RTCIceCandidateInit, id: string): Promise<void> {
    const pc = this.connections.get(id);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    }
  }

  clear() {
    this.connections.forEach((pc) => {
      pc.close();
    });
    this.connections.clear();
    this.streams.clear();
  }
}

function spawnVideo(stream: MediaStream, node: VElement) {
  const videoEl = document.createElement('video');

  videoEl.srcObject = stream
  videoEl.setAttribute('autoplay', 'true');
  videoEl.setAttribute('muted', 'true');
  videoEl.setAttribute('playsinline', 'true');
  videoEl.setAttribute('crossorigin', 'anonymous');

  videoEl.play()
    .then(() => true)
    .catch(() => {
      // we allow that if user just reloaded the page
    })

  const clearListeners = () => {
    document.removeEventListener('click', startStream)
    videoEl.removeEventListener('playing', clearListeners)
  }
  videoEl.addEventListener('playing', clearListeners)

  const startStream = () => {
    videoEl.play()
      .then(() => console.log('unpaused'))
      .catch(() => {
        // we allow that if user just reloaded the page
      })
    document.removeEventListener('click', startStream)
  }
  document.addEventListener('click', startStream)

  return videoEl;
}

function spawnDebugVideo(stream: MediaStream, node: VElement) {
  const video = document.createElement('video');
  video.id = 'canvas-or-testing';
  video.style.border = '1px solid red';
  video.setAttribute('autoplay', 'true');
  video.setAttribute('muted', 'true');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('crossorigin', 'anonymous');

  const coords = node.node.getBoundingClientRect();

  Object.assign(video.style, {
    position: 'absolute',
    left: `${coords.left}px`,
    top: `${coords.top}px`,
    width: `${coords.width}px`,
    height: `${coords.height}px`,
  });
  video.width = coords.width;
  video.height = coords.height;
  video.srcObject = stream;

  document.body.appendChild(video);
  video
    .play()
    .then(() => {
      console.debug('started streaming canvas');
    })
    .catch((e) => {
      console.error(e);
      const waiter = () => {
        void video.play();
        document.removeEventListener('click', waiter);
      };
      document.addEventListener('click', waiter);
    });
}

function checkId(id: string, cId: string): boolean {
  return id.includes(cId);
}

/** simple peer example
 * // @ts-ignore
 *     const peer = new SLPeer({ initiator: false })
 *     socket.on('c_signal', ({ data }) => {
 *       console.log('got signal', data)
 *       peer.signal(data.data);
 *       peer.canvasId = data.id;
 *     });
 *
 *     peer.on('signal', (data: any) => {
 *       socket.emit('c_signal', data);
 *     });
 *     peer.on('stream', (stream: MediaStream) => {
 *       console.log('stream ready', stream, peer.canvasId);
 *       this.streams.set(peer.canvasId, stream)
 *       setTimeout(() => {
 *         const node = this.getNode(peer.canvasId)
 *         console.log(peer.canvasId, this.streams, node)
 *         spawnVideo(this.streams.get(peer.canvasId)?.clone(), node, this.screen)
 *       }, 500)
 *     })
 *     peer.on('error', console.error)
 *
 * */
