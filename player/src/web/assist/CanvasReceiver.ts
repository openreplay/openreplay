import logger from '../../logger';
import MessageManager from '../MessageManager';
import type { Socket } from './types';
import { listen, unwrap } from './utils';

const ATTACH_DELAY = 250;
const ATTACH_RETRY_DELAY = 1000;
const ATTACH_RETRIES = 10;

interface CanvasData {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  release: () => void;
}

export default class CanvasReceiver {
  private connections: Map<string, RTCPeerConnection> = new Map();

  private canvasesData = new Map<string, CanvasData>();

  private pendingAttach = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly cId: string;

  private frameCounter = 0;

  private rafId: number | null = null;

  private readonly unsubscribe: () => void;

  constructor(
    private readonly peerIdPrefix: string,
    private readonly config: RTCIceServer[],
    private readonly getNode: MessageManager['getNode'],
    private readonly agentInfo: Record<string, any>,
    private readonly socket: Socket,
  ) {
    // Form an id like in PeerJS
    this.cId = `${this.peerIdPrefix}-${this.agentInfo.id}-canvas`;

    this.unsubscribe = listen(socket, {
      webrtc_canvas_offer: (payload) => {
        const data = unwrap<
          { offer: RTCSessionDescriptionInit; id: string } | undefined
        >(payload);
        if (data && this.isOwnId(data.id)) {
          void this.handleOffer(data.offer, data.id);
        }
      },
      webrtc_canvas_ice_candidate: (payload) => {
        const data = unwrap<
          { candidate: RTCIceCandidateInit; id: string } | undefined
        >(payload);
        if (data && this.isOwnId(data.id)) {
          void this.handleCandidate(data.candidate, data.id);
        }
      },
      webrtc_canvas_stop: (payload) => {
        const data = unwrap<{ id: string } | undefined>(payload);
        if (data && this.isOwnId(data.id)) {
          this.stopCanvas(data.id);
        }
      },
      webrtc_canvas_restart: () => this.clear(),
    });
  }

  private isOwnId(id: unknown): id is string {
    return typeof id === 'string' && id.startsWith(`${this.cId}-`);
  }

  /** id is `${peerId}-${agentId}-canvas-${nodeId}` */
  private canvasIdOf(id: string): string {
    return id.slice(this.cId.length + 1);
  }

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    id: string,
  ): Promise<void> {
    if (this.connections.has(id)) {
      this.stopCanvas(id);
    }
    const pc = new RTCPeerConnection({
      iceServers: this.config,
    });
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
      if (stream && this.connections.get(id) === pc) {
        this.attach(this.canvasIdOf(id), stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        this.connections.get(id) === pc &&
        (pc.connectionState === 'failed' || pc.connectionState === 'closed')
      ) {
        this.stopCanvas(id);
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.connections.get(id) !== pc) return;
      this.socket.emit('webrtc_canvas_answer', { answer, id });
    } catch (e) {
      logger.error('Canvas stream negotiation failed', id, e);
      if (this.connections.get(id) === pc) {
        this.stopCanvas(id);
      }
    }
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

  private attach(canvasId: string, stream: MediaStream, attempt = 0) {
    this.clearPendingAttach(canvasId);
    const timer = setTimeout(
      () => {
        this.pendingAttach.delete(canvasId);
        const canvas = this.getNode(parseInt(canvasId, 10))?.node as
          | HTMLCanvasElement
          | undefined;
        const canvasCtx =
          typeof canvas?.getContext === 'function'
            ? canvas.getContext('2d')
            : null;
        if (!canvas || !canvasCtx) {
          if (attempt < ATTACH_RETRIES) {
            this.attach(canvasId, stream, attempt + 1);
          } else {
            logger.log('NODE', canvasId, 'IS NOT FOUND');
          }
          return;
        }
        this.canvasesData.get(canvasId)?.release();
        const { video, release } = spawnVideo(stream.clone());
        this.canvasesData.set(canvasId, { video, canvas, canvasCtx, release });
        this.startDrawing();
      },
      attempt === 0 ? ATTACH_DELAY : ATTACH_RETRY_DELAY,
    );
    this.pendingAttach.set(canvasId, timer);
  }

  private clearPendingAttach(canvasId: string) {
    const timer = this.pendingAttach.get(canvasId);
    if (timer) {
      clearTimeout(timer);
      this.pendingAttach.delete(canvasId);
    }
  }

  private detach(canvasId: string) {
    this.clearPendingAttach(canvasId);
    this.canvasesData.get(canvasId)?.release();
    this.canvasesData.delete(canvasId);
    if (this.canvasesData.size === 0) {
      this.stopDrawing();
    }
  }

  private stopCanvas(id: string) {
    const pc = this.connections.get(id);
    if (pc) {
      closePeer(pc);
      this.connections.delete(id);
    }
    this.detach(this.canvasIdOf(id));
  }

  clear() {
    this.connections.forEach(closePeer);
    this.connections.clear();
    this.pendingAttach.forEach((timer) => clearTimeout(timer));
    this.pendingAttach.clear();
    this.canvasesData.forEach((data) => data.release());
    this.canvasesData.clear();
    this.stopDrawing();
  }

  clean() {
    this.unsubscribe();
    this.clear();
  }

  private startDrawing() {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.draw);
    }
  }

  private stopDrawing() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private draw = () => {
    this.rafId = null;
    if (this.frameCounter++ % 4 === 0) {
      this.canvasesData.forEach((data, id) => {
        const node = this.getNode(parseInt(id, 10))?.node as
          | HTMLCanvasElement
          | undefined;
        if (!node) {
          this.detach(id);
          return;
        }
        if (node !== data.canvas) {
          // the element was re-created (e.g. after a rewind)
          const ctx =
            typeof node.getContext === 'function' ? node.getContext('2d') : null;
          if (!ctx) return;
          data.canvas = node;
          data.canvasCtx = ctx;
        }
        data.canvasCtx.drawImage(
          data.video,
          0,
          0,
          data.canvas.width,
          data.canvas.height,
        );
      });
    }
    if (this.canvasesData.size > 0) {
      this.startDrawing();
    }
  };
}

function closePeer(pc: RTCPeerConnection) {
  pc.onicecandidate = null;
  pc.ontrack = null;
  pc.onconnectionstatechange = null;
  pc.close();
}

function spawnVideo(stream: MediaStream) {
  const videoEl = document.createElement('video');

  videoEl.srcObject = stream;
  videoEl.setAttribute('autoplay', 'true');
  videoEl.setAttribute('muted', 'true');
  videoEl.setAttribute('playsinline', 'true');
  videoEl.setAttribute('crossorigin', 'anonymous');

  const clearListeners = () => {
    document.removeEventListener('click', startStream);
    videoEl.removeEventListener('playing', clearListeners);
  };
  // autoplay can be blocked until the agent interacts with the page
  const startStream = () => {
    videoEl
      .play()
      .then(clearListeners)
      .catch(() => {});
  };
  videoEl.addEventListener('playing', clearListeners);
  document.addEventListener('click', startStream);

  videoEl.play().catch(() => {
    logger.warn('Click to unpause canvas stream');
  });

  const release = () => {
    clearListeners();
    videoEl.pause();
    videoEl.srcObject = null;
    stream.getTracks().forEach((t) => t.stop());
  };

  return { video: videoEl, release };
}
