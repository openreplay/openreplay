import Peer from 'peerjs';
import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import MessageManager from 'Player/web/MessageManager';

export default class CanvasReceiver {
  private streams: Map<string, MediaStream> = new Map();
  private peer: Peer | null = null;

  constructor(
    private readonly peerIdPrefix: string,
    private readonly config: RTCIceServer[] | null,
    private readonly getNode: MessageManager['getNode'],
    private readonly agentInfo: Record<string, any>
  ) {
    // @ts-ignore
    const urlObject = new URL(window.env.API_EDP || window.location.origin);
    const peerOpts: Peer.PeerJSOption = {
      host: urlObject.hostname,
      path: '/assist',
      port:
        urlObject.port === ''
          ? location.protocol === 'https:'
            ? 443
            : 80
          : parseInt(urlObject.port),
    };
    if (this.config) {
      peerOpts['config'] = {
        iceServers: this.config,
        //@ts-ignore
        sdpSemantics: 'unified-plan',
        iceTransportPolicy: 'all',
      };
    }
    const id = `${this.peerIdPrefix}-${this.agentInfo.id}-canvas`;
    const canvasPeer = new Peer(id, peerOpts);
    this.peer = canvasPeer;
    canvasPeer.on('error', (err) => console.error('canvas peer error', err));
    canvasPeer.on('call', (call) => {
      call.answer();
      const canvasId = call.peer.split('-')[2];
      call.on('stream', (stream) => {
        this.streams.set(canvasId, stream);
        setTimeout(() => {
          const node = this.getNode(parseInt(canvasId, 10));
          console.log(canvasId, this.streams, node);
          spawnVideo(this.streams.get(canvasId)?.clone() as MediaStream, node as VElement);
        }, 500);
      });
      call.on('error', (err) => console.error('canvas call error', err));
    });
  }

  clear() {
    if (this.peer) {
      // otherwise it calls reconnection on data chan close
      const peer = this.peer;
      this.peer = null;
      peer.disconnect();
      peer.destroy();
    }
  }
}

function spawnVideo(stream: MediaStream, node: VElement) {
  (node.node as HTMLVideoElement).srcObject = stream.clone();
  (node.node as HTMLVideoElement).setAttribute('autoplay', 'true');
  (node.node as HTMLVideoElement).setAttribute('muted', 'true');
  (node.node as HTMLVideoElement).setAttribute('playsinline', 'true');
  (node.node as HTMLVideoElement).setAttribute('crossorigin', 'anonymous');
  void (node.node as HTMLVideoElement).play();
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
      console.log('started streaming canvas');
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
