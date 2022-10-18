import type { Socket } from 'socket.io-client';
import type Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import store from 'App/store';
import type { LocalStream } from './LocalStream';
import { update, getState } from '../../store';
// import { iceServerConfigFromString } from 'App/utils'
import AnnotationCanvas from './AnnotationCanvas';
import MStreamReader from '../messages/MStreamReader';
import JSONRawMessageReader from '../messages/JSONRawMessageReader'

export enum CallingState {
  NoCall,
  Connecting,
  Requesting,
  Reconnecting,
  OnCall,
}

export enum ConnectionStatus {
  Connecting,
  WaitingMessages,
  Connected,
  Inactive,
  Disconnected,
  Error,
  Closed,
}

export enum RemoteControlStatus {
  Disabled = 0,
  Requesting,
  Enabled,
}


export function getStatusText(status: ConnectionStatus): string {
  switch(status) {
    case ConnectionStatus.Closed:
      return 'Closed...';
    case ConnectionStatus.Connecting:
      return "Connecting...";
    case ConnectionStatus.Connected:
      return "";
    case ConnectionStatus.Inactive:
      return "Client tab is inactive";
    case ConnectionStatus.Disconnected:
      return "Disconnected";
    case ConnectionStatus.Error:
      return "Something went wrong. Try to reload the page.";
    case ConnectionStatus.WaitingMessages:
      return "Connected. Waiting for the data... (The tab might be inactive)"
  }
}

export interface State {
  calling: CallingState;
  peerConnectionStatus: ConnectionStatus;
  remoteControl: RemoteControlStatus;
  annotating: boolean;
  assistStart: number;
}

export const INITIAL_STATE: State = {
  calling: CallingState.NoCall,
  peerConnectionStatus: ConnectionStatus.Connecting,
  remoteControl: RemoteControlStatus.Disabled,
  annotating: false,
  assistStart: 0,
}

const MAX_RECONNECTION_COUNT = 4;

export default class AssistManager {
  private videoStreams: Record<string, MediaStreamTrack> = {}

  // TODO: Session type
  constructor(private session: any, private md: MessageDistributor, private config: any) {}

  private setStatus(status: ConnectionStatus) {
    if (getState().peerConnectionStatus === ConnectionStatus.Disconnected &&
      status !== ConnectionStatus.Connected) {
      return
    }

    if (status === ConnectionStatus.Connecting) {
      this.md.setMessagesLoading(true);
    } else {
      this.md.setMessagesLoading(false);
    }
    if (status === ConnectionStatus.Connected) {
      this.md.display(true);
    } else {
      this.md.display(false);
    }
    update({ peerConnectionStatus: status });
  }

  private get peerID(): string {
    return `${this.session.projectKey}-${this.session.sessionId}`
  }

  private socketCloseTimeout: ReturnType<typeof setTimeout> | undefined
  private onVisChange = () => {
    this.socketCloseTimeout && clearTimeout(this.socketCloseTimeout)
    if (document.hidden) {
      this.socketCloseTimeout = setTimeout(() => {
        const state = getState()
        if (document.hidden &&
          (state.calling === CallingState.NoCall && state.remoteControl === RemoteControlStatus.Enabled)) {
          this.socket?.close()
        }
      }, 30000)
    } else {
      this.socket?.open()
    }
  }

  private socket: Socket | null = null
  connect(agentToken: string) {
    const jmr = new JSONRawMessageReader()
    const reader = new MStreamReader(jmr, this.session.startedAt)
    let waitingForMessages = true
    let disconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let inactiveTimeout: ReturnType<typeof setTimeout> | undefined
    function clearDisconnectTimeout() {
      disconnectTimeout && clearTimeout(disconnectTimeout)
      disconnectTimeout = undefined
    }
    function clearInactiveTimeout() {
      inactiveTimeout && clearTimeout(inactiveTimeout)
      inactiveTimeout = undefined
    }

    const now = +new Date()
    update({ assistStart: now })

    import('socket.io-client').then(({ default: io }) => {
      if (this.cleaned) { return }
      if (this.socket) { this.socket.close() } // TODO: single socket connection
      // @ts-ignore
      const urlObject = new URL(window.env.API_EDP || window.location.origin) // does it handle ssl automatically?

      // @ts-ignore WTF, socket.io ???
      const socket: Socket = this.socket = io(urlObject.origin, {
        path: '/ws-assist/socket',
        auth: {
          token: agentToken
        },
        query: {
          peerId: this.peerID,
          identity: "agent",
          //agentInfo: JSON.stringify({})
        }
      })
      socket.on("connect", () => {
        waitingForMessages = true
        this.setStatus(ConnectionStatus.WaitingMessages) // TODO: happens frequently on bad network
      })
      socket.on("disconnect", () => {
        this.toggleRemoteControl(false)
        update({ calling: CallingState.NoCall })
      })
      socket.on('messages', messages => {
        jmr.append(messages) // as RawMessage[]

        if (waitingForMessages) {
          waitingForMessages = false // TODO: more explicit
          this.setStatus(ConnectionStatus.Connected)

          // Call State
          if (getState().calling === CallingState.Reconnecting) {
            this._callSessionPeer() // reconnecting call (todo improve code separation)
          }
        }

        for (let msg = reader.readNext();msg !== null;msg = reader.readNext()) {
          // @ts-ignore TODO: fix msg types in generator
          this.md.appendMessage(msg, msg._index)
        }
      })
      socket.on("control_granted", id => {
        this.toggleRemoteControl(id === socket.id)
      })
      socket.on("control_rejected", id => {
        id === socket.id && this.toggleRemoteControl(false)
      })
      socket.on('SESSION_RECONNECTED', () => {
        clearDisconnectTimeout()
        clearInactiveTimeout()
        this.setStatus(ConnectionStatus.Connected)
      })

      socket.on('UPDATE_SESSION', ({ active }) => {
        clearDisconnectTimeout()
        !inactiveTimeout && this.setStatus(ConnectionStatus.Connected)
        if (typeof active === "boolean") {
          clearInactiveTimeout()
          if (active) {
            this.setStatus(ConnectionStatus.Connected)
          } else {
            inactiveTimeout = setTimeout(() => this.setStatus(ConnectionStatus.Inactive), 5000)
          }
        }
      })
      socket.on('videofeed', ({ streamId, enabled }) => {
        console.log(streamId, enabled)
        console.log(this.videoStreams)
        if (this.videoStreams[streamId]) {
          this.videoStreams[streamId].enabled = enabled
        }
        console.log(this.videoStreams)
      })
      socket.on('SESSION_DISCONNECTED', e => {
        waitingForMessages = true
        clearDisconnectTimeout()
        disconnectTimeout = setTimeout(() => {
          if (this.cleaned) { return }
          this.setStatus(ConnectionStatus.Disconnected)
        }, 30000)

        if (getState().remoteControl === RemoteControlStatus.Requesting) {
          this.toggleRemoteControl(false) // else its remaining
        }

        // Call State
        if (getState().calling === CallingState.OnCall) {
          update({ calling: CallingState.Reconnecting })
        } else if (getState().calling === CallingState.Requesting){
          update({ calling: CallingState.NoCall })
        }
      })
      socket.on('error', e => {
        console.warn("Socket error: ", e )
        this.setStatus(ConnectionStatus.Error);
        this.toggleRemoteControl(false)
      })
      socket.on('call_end', this.onRemoteCallEnd)

      document.addEventListener('visibilitychange', this.onVisChange)

    })
  }

  /* ==== Remote Control ==== */

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.socket) { return }
    const data = this.md.getInternalCoordinates(e)
    this.socket.emit("move", [ data.x, data.y ])
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    if (!this.socket) { return }
    //throttling makes movements less smooth, so it is omitted
    //this.onMouseMove(e)
    this.socket.emit("scroll", [ e.deltaX, e.deltaY ])
  }

  private onMouseClick = (e: MouseEvent): void => {
    if (!this.socket) { return; }
    if (getState().annotating) { return; } // ignore clicks while annotating

    const data = this.md.getInternalViewportCoordinates(e)
    // const el = this.md.getElementFromPoint(e); // requires requestiong node_id from domManager
    const el = this.md.getElementFromInternalPoint(data)
    if (el instanceof HTMLElement) {
      el.focus()
      el.oninput = e => {
        if (el instanceof HTMLTextAreaElement
          || el instanceof HTMLInputElement
        ) {
          this.socket && this.socket.emit("input", el.value)
        } else if (el.isContentEditable) {
          this.socket && this.socket.emit("input", el.innerText)
        }
      }
      // TODO: send "focus" event to assist with the nodeID
      el.onkeydown = e => {
        if (e.key == "Tab") {
          e.preventDefault()
        }
      }
      el.onblur = () => {
        el.oninput = null
        el.onblur = null
      }
    }
    this.socket.emit("click",  [ data.x, data.y ]);
  }

  private toggleRemoteControl(enable: boolean){
    if (enable) {
      this.md.overlay.addEventListener("mousemove", this.onMouseMove)
      this.md.overlay.addEventListener("click", this.onMouseClick)
      this.md.overlay.addEventListener("wheel", this.onWheel)
      this.md.toggleRemoteControlStatus(true)
      update({ remoteControl: RemoteControlStatus.Enabled })
    } else {
      this.md.overlay.removeEventListener("mousemove", this.onMouseMove)
      this.md.overlay.removeEventListener("click", this.onMouseClick)
      this.md.overlay.removeEventListener("wheel", this.onWheel)
      this.md.toggleRemoteControlStatus(false)
      update({ remoteControl: RemoteControlStatus.Disabled })
      this.toggleAnnotation(false)
    }
  }

  requestReleaseRemoteControl = () => {
    if (!this.socket) { return }
    const remoteControl = getState().remoteControl
    if (remoteControl === RemoteControlStatus.Requesting) { return }
    if (remoteControl === RemoteControlStatus.Disabled) {
      update({ remoteControl: RemoteControlStatus.Requesting })
      this.socket.emit("request_control")
      // setTimeout(() => {
      //   if (getState().remoteControl !== RemoteControlStatus.Requesting) { return }
      //   this.socket?.emit("release_control")
      //   update({ remoteControl: RemoteControlStatus.Disabled })
      // }, 8000)
    } else {
      this.socket.emit("release_control")
      this.toggleRemoteControl(false)
    }
  }

  releaseRemoteControl = () => {
    if (!this.socket) { return }
    this.socket.emit("release_control")
    this.toggleRemoteControl(false)
  }


  /* ==== PeerJS Call ==== */

  private _peer: Peer | null = null
  private connectionAttempts: number = 0
  private callConnection: MediaConnection[] = []
  private getPeer(): Promise<Peer> {
    if (this._peer && !this._peer.disconnected) { return Promise.resolve(this._peer) }

    // @ts-ignore
    const urlObject = new URL(window.env.API_EDP || window.location.origin)
    return import('peerjs').then(({ default: Peer }) => {
      if (this.cleaned) {return Promise.reject("Already cleaned")}
      const peerOpts: any = {
        host: urlObject.hostname,
        path: '/assist',
        port: urlObject.port === "" ? (location.protocol === 'https:' ? 443 : 80 ): parseInt(urlObject.port),
      }
      if (this.config) {
        peerOpts['config'] = {
          iceServers: this.config,
          sdpSemantics: 'unified-plan',
          iceTransportPolicy: 'relay',
        };
      }
      const peer = this._peer = new Peer(peerOpts)
      peer.on('call', call => {
        console.log('getting call from', call.peer)
          call.answer(this.callArgs.localStream.stream)
          this.callConnection.push(call)

          this.callArgs.localStream.onVideoTrack(vTrack => {
            const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
            if (!sender) {
              console.warn("No video sender found")
              return
            }
            sender.replaceTrack(vTrack)
          })

          call.on('stream', stream => {
            this.videoStreams[call.peer] = stream.getVideoTracks()[0]
            this.callArgs && this.callArgs.onStream(stream)
          });
          // call.peerConnection.addEventListener("track", e => console.log('newtrack',e.track))

          call.on("close", this.onRemoteCallEnd)
          call.on("error", (e) => {
            console.error("PeerJS error (on call):", e)
            this.initiateCallEnd();
            this.callArgs && this.callArgs.onError && this.callArgs.onError();
          });
      })
      peer.on('error', e => {
        if (e.type === 'disconnected') {
          return peer.reconnect()
        } else if (e.type !== 'peer-unavailable') {
          console.error(`PeerJS error (on peer). Type ${e.type}`, e);
        }

        //call-reconnection connected
 //       if (['peer-unavailable', 'network', 'webrtc'].includes(e.type)) {
          // this.setStatus(this.connectionAttempts++ < MAX_RECONNECTION_COUNT
          //   ? ConnectionStatus.Connecting
          //   : ConnectionStatus.Disconnected);
          // Reconnect...
      })

      return new Promise(resolve => {
        peer.on("open", () => resolve(peer))
      })
    });

  }


  private handleCallEnd() {
    this.callArgs && this.callArgs.onCallEnd()
    this.callConnection[0] && this.callConnection[0].close()
    update({ calling: CallingState.NoCall })
    this.callArgs = null
    this.toggleAnnotation(false)
  }

  public initiateCallEnd = async () => {
    this.socket?.emit("call_end", store.getState().getIn([ 'user', 'account', 'name']))
    this.handleCallEnd()
    const remoteControl = getState().remoteControl
    if (remoteControl === RemoteControlStatus.Enabled) {
      this.socket.emit("release_control")
      this.toggleRemoteControl(false)
    }
  }

  private onRemoteCallEnd = () => {
    if (getState().calling === CallingState.Requesting) {
      this.callArgs && this.callArgs.onReject()
      this.callConnection[0] && this.callConnection[0].close()
      update({ calling: CallingState.NoCall })
      this.callArgs = null
      this.toggleAnnotation(false)
    } else {
      this.handleCallEnd()
    }
  }

  private callArgs: {
    localStream: LocalStream,
    onStream: (s: MediaStream)=>void,
    onCallEnd: () => void,
    onReject: () => void,
    onError?: ()=> void,
  } | null = null

  public setCallArgs(
    localStream: LocalStream,
    onStream: (s: MediaStream)=>void,
    onCallEnd: () => void,
    onReject: () => void,
    onError?: ()=> void,
  ) {
    this.callArgs = {
      localStream,
      onStream,
      onCallEnd,
      onReject,
      onError,
    }
  }

  public call(thirdPartyPeers?: string[]): { end: Function } {
    if (thirdPartyPeers && thirdPartyPeers.length > 0) {
      this.addPeerCall(thirdPartyPeers)
    } else {
      this._callSessionPeer()
    }
    return {
      end: this.initiateCallEnd,
    }
  }

  /** Connecting to the other agents that are already
   *  in the call with the user
   */
  public addPeerCall(thirdPartyPeers: string[]) {
    thirdPartyPeers.forEach(peer => this._peerConnection(peer))
  }

  /** Connecting to the app user */
  private _callSessionPeer() {
    if (![CallingState.NoCall, CallingState.Reconnecting].includes(getState().calling)) { return }
    update({ calling: CallingState.Connecting })
    this._peerConnection(this.peerID);
    this.socket && this.socket.emit("_agent_name", store.getState().getIn([ 'user', 'account', 'name']))
  }

  private async _peerConnection(remotePeerId: string) {
    try {
      const peer = await this.getPeer();
      const call = peer.call(remotePeerId, this.callArgs.localStream.stream)
      this.callConnection.push(call)

      this.callArgs.localStream.onVideoTrack(vTrack => {
        const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
        if (!sender) {
          console.warn("No video sender found")
          return
        }
        sender.replaceTrack(vTrack)
      })

      call.on('stream', stream => {
        getState().calling !== CallingState.OnCall && update({ calling: CallingState.OnCall })

        this.videoStreams[call.peer] = stream.getVideoTracks()[0]

        this.callArgs && this.callArgs.onStream(stream)
      });
      // call.peerConnection.addEventListener("track", e => console.log('newtrack',e.track))

      call.on("close", this.onRemoteCallEnd)
      call.on("error", (e) => {
        console.error("PeerJS error (on call):", e)
        this.initiateCallEnd();
        this.callArgs && this.callArgs.onError && this.callArgs.onError();
      });
    } catch (e) {
      console.error(e)
    }
  }

  toggleAnnotation(enable?: boolean) {
    // if (getState().calling !== CallingState.OnCall) { return }
    if (typeof enable !== "boolean") {
      enable = !!getState().annotating
    }
    if (enable && !this.annot) {
      const annot = this.annot = new AnnotationCanvas()
      annot.mount(this.md.overlay)
      annot.canvas.addEventListener("mousedown", e => {
        if (!this.socket) { return }
        const data = this.md.getInternalViewportCoordinates(e)
        annot.start([ data.x, data.y ])
        this.socket.emit("startAnnotation", [ data.x, data.y ])
      })
      annot.canvas.addEventListener("mouseleave", () => {
        if (!this.socket) { return }
        annot.stop()
        this.socket.emit("stopAnnotation")
      })
      annot.canvas.addEventListener("mouseup", () => {
        if (!this.socket) { return }
        annot.stop()
        this.socket.emit("stopAnnotation")
      })
      annot.canvas.addEventListener("mousemove", e => {
        if (!this.socket || !annot.isPainting()) { return }

        const data = this.md.getInternalViewportCoordinates(e)
        annot.move([ data.x, data.y ])
        this.socket.emit("moveAnnotation", [ data.x, data.y ])
      })
      update({ annotating: true })
    } else if (!enable && !!this.annot) {
      this.annot.remove()
      this.annot = null
      update({ annotating: false })
    }
  }

  toggleVideoLocalStream(enabled: boolean) {
    this.getPeer().then((peer) => {
      this.socket.emit('videofeed', { streamId: peer.id, enabled })
    })
  }

  private annot: AnnotationCanvas | null = null

  /* ==== Cleaning ==== */
  private cleaned: boolean = false
  clear() {
    this.cleaned = true // sometimes cleaned before modules loaded
    this.initiateCallEnd();
    if (this._peer) {
      console.log("destroying peer...")
      const peer = this._peer; // otherwise it calls reconnection on data chan close
      this._peer = null;
      peer.disconnect();
      peer.destroy();
    }
    if (this.socket) {
      this.socket.close()
      document.removeEventListener('visibilitychange', this.onVisChange)
    }
    if (this.annot) {
      this.annot.remove()
      this.annot = null
    }
  }
}
