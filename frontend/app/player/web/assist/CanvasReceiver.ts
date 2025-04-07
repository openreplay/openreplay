import logger from '@/logger';
import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import MessageManager from 'Player/web/MessageManager';
import { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
export default class CanvasReceiver {
  private streams: Map<string, MediaStream> = new Map();

  // Store RTCPeerConnection for each remote peer
  private connections: Map<string, RTCPeerConnection> = new Map();

  private cId: string;

  private frameCounter = 0;
  private canvasesData = new Map<
    string,
    {
      video: HTMLVideoElement;
      canvas: HTMLCanvasElement;
      canvasCtx: CanvasRenderingContext2D;
    }
  >(new Map());

  // sendSignal – for sending signals (offer/answer/ICE)
  constructor(
    private readonly peerIdPrefix: string,
    private readonly config: RTCIceServer[],
    private readonly getNode: MessageManager['getNode'],
    private readonly agentInfo: Record<string, any>,
    private readonly socket: Socket,
  ) {
    // Form an id like in PeerJS
    this.cId = `${this.peerIdPrefix}-${this.agentInfo.id}-canvas`;

    this.socket.on(
      'webrtc_canvas_offer',
      (data: { data: { offer: RTCSessionDescriptionInit; id: string } }) => {
        const { offer, id } = data.data;
        if (checkId(id, this.cId)) {
          this.handleOffer(offer, id);
        }
      },
    );

    this.socket.on(
      'webrtc_canvas_ice_candidate',
      (data: { data: { candidate: RTCIceCandidateInit; id: string } }) => {
        const { candidate, id } = data.data;
        if (checkId(id, this.cId)) {
          this.handleCandidate(candidate, id);
        }
      },
    );

    this.socket.on('webrtc_canvas_stop', (data: { id: string }) => {
      const { id } = data;
      const canvasId = getCanvasId(id);
      this.connections.delete(id);
      this.streams.delete(id);
      this.canvasesData.delete(canvasId);
    });

    this.socket.on('webrtc_canvas_restart', () => {
      this.clear();
    });
  }

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    id: string,
  ): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: this.config,
    });

    // Save the connection
    this.connections.set(id, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_canvas_ice_candidate', {
          candidate: event.candidate,
          id,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        // Detect canvasId from remote peer id
        const canvasId = getCanvasId(id);
        this.streams.set(canvasId, stream);
        setTimeout(() => {
          const node = this.getNode(parseInt(canvasId, 10));
          const videoEl = spawnVideo(
            stream.clone() as MediaStream,
            node as VElement,
          );
          if (node && videoEl) {
            this.canvasesData.set(canvasId, {
              video: videoEl,
              canvas: node.node as HTMLCanvasElement,
              canvasCtx: (node.node as HTMLCanvasElement)?.getContext(
                '2d',
              ) as CanvasRenderingContext2D,
            });
            this.draw();
          } else {
            logger.log('NODE', canvasId, 'IS NOT FOUND');
          }
        }, 250);
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc_canvas_answer', { answer, id });
  }

  async handleCandidate(
    candidate: RTCIceCandidateInit,
    id: string,
  ): Promise<void> {
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
    this.canvasesData.clear();
  }

  draw = () => {
    if (this.frameCounter % 4 === 0) {
      if (this.canvasesData.size === 0) {
        return;
      }
      this.canvasesData.forEach((canvasData, id) => {
        const { video, canvas, canvasCtx } = canvasData;
        const node = this.getNode(parseInt(id, 10));
        if (node) {
          canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          this.canvasesData.delete(id);
        }
      });
    }
    this.frameCounter++;
    requestAnimationFrame(() => this.draw());
  };
}

function spawnVideo(stream: MediaStream, node: VElement) {
  const videoEl = document.createElement('video');

  videoEl.srcObject = stream;
  videoEl.setAttribute('autoplay', 'true');
  videoEl.setAttribute('muted', 'true');
  videoEl.setAttribute('playsinline', 'true');
  videoEl.setAttribute('crossorigin', 'anonymous');

  videoEl
    .play()
    .then(() => true)
    .catch(() => {
      toast.error('Click to unpause canvas stream', {
        autoClose: false,
        toastId: 'canvas-stream',
      });
      // we allow that if user just reloaded the page
    });

  const clearListeners = () => {
    document.removeEventListener('click', startStream);
    videoEl.removeEventListener('playing', clearListeners);
  };
  videoEl.addEventListener('playing', clearListeners);

  const startStream = () => {
    videoEl
      .play()
      .then(() => {
        toast.dismiss('canvas-stream');
        clearListeners();
      })
      .then(() => console.log('unpaused'))
      .catch(() => {
        // we allow that if user just reloaded the page
      });
    document.removeEventListener('click', startStream);
  };
  document.addEventListener('click', startStream);

  return videoEl;
}

function checkId(id: string, cId: string): boolean {
  return id.includes(cId);
}

function getCanvasId(id: string): string {
  return id.split('-')[4];
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
