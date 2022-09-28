import type { Socket } from 'socket.io-client';
import type Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { Message } from '../messages'
import store from 'App/store';
import type { LocalStream } from './LocalStream';
import { update, getState } from '../../store';
import { iceServerConfigFromString } from 'App/utils'
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
  calling: CallingState,
  peerConnectionStatus: ConnectionStatus,
  remoteControl: RemoteControlStatus,
  annotating: boolean,
}

export const INITIAL_STATE: State = {
  calling: CallingState.NoCall,
  peerConnectionStatus: ConnectionStatus.Connecting,
  remoteControl: RemoteControlStatus.Disabled,
  annotating: false,
}

const MAX_RECONNECTION_COUNT = 4;


export default class AssistManager {
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
    const reader = new MStreamReader(jmr)
    let waitingForMessages = true
    let showDisconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let inactiveTimeout: ReturnType<typeof setTimeout> | undefined
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
      //socket.onAny((...args) => console.log(...args))
      socket.on("connect", () => {
        waitingForMessages = true
        this.setStatus(ConnectionStatus.WaitingMessages) // TODO: happens frequently on bad network
      })
      socket.on("disconnect", () => {
        this.toggleRemoteControl(false)
        update({ calling: CallingState.NoCall })
      })
      socket.on('messages', messages => {
        //console.log(messages.filter(m => m._id === 41 || m._id === 44))
        jmr.append(messages) // as RawMessage[]

        if (waitingForMessages) {
          waitingForMessages = false // TODO: more explicit
          this.setStatus(ConnectionStatus.Connected)

          // Call State
          if (getState().calling === CallingState.Reconnecting) {
            this._call()  // reconnecting call (todo improve code separation)
          }
        }

        for (let msg = reader.readNext();msg !== null;msg = reader.readNext()) {
          //@ts-ignore
          this.md.distributeMessage(msg, msg._index)
        }
      })
      socket.on("control_granted", id => {
        this.toggleRemoteControl(id === socket.id)
      })
      socket.on("control_rejected", id => {
        id === socket.id && this.toggleRemoteControl(false)
      })
      socket.on('SESSION_RECONNECTED', () => {
        showDisconnectTimeout && clearTimeout(showDisconnectTimeout)
        inactiveTimeout && clearTimeout(inactiveTimeout)
        this.setStatus(ConnectionStatus.Connected)
      })

      socket.on('UPDATE_SESSION', ({ active }) => {
        showDisconnectTimeout && clearTimeout(showDisconnectTimeout)
        !inactiveTimeout && this.setStatus(ConnectionStatus.Connected)
        if (typeof active === "boolean") {
          if (active) {
            inactiveTimeout && clearTimeout(inactiveTimeout)
            this.setStatus(ConnectionStatus.Connected)
          } else {
            inactiveTimeout = setTimeout(() => this.setStatus(ConnectionStatus.Inactive), 5000)
          }
        }
      })
      socket.on('SESSION_DISCONNECTED', e => {
        waitingForMessages = true
        showDisconnectTimeout && clearTimeout(showDisconnectTimeout)
        showDisconnectTimeout = setTimeout(() => {
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
      update({ remoteControl: RemoteControlStatus.Enabled })
    } else {
      this.md.overlay.removeEventListener("mousemove", this.onMouseMove)
      this.md.overlay.removeEventListener("click", this.onMouseClick)
      this.md.overlay.removeEventListener("wheel", this.onWheel)
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


  /* ==== PeerJS Call ==== */

  private _peer: Peer | null = null
  private connectionAttempts: number = 0
  private callConnection: MediaConnection | null = null
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
    this.callConnection && this.callConnection.close()
    update({ calling: CallingState.NoCall })
    this.callArgs = null
    this.toggleAnnotation(false)
  }

  private initiateCallEnd = () => {
    this.socket?.emit("call_end")
    this.handleCallEnd()
  }

  private onRemoteCallEnd = () => {
    if (getState().calling === CallingState.Requesting) {
      this.callArgs && this.callArgs.onReject()
      this.callConnection && this.callConnection.close()
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
    onError?: ()=> void
  } | null = null

  call(
    localStream: LocalStream, 
    onStream: (s: MediaStream)=>void, 
    onCallEnd: () => void, 
    onReject: () => void, 
    onError?: ()=> void): { end: Function } {
    this.callArgs = {
      localStream,
      onStream,
      onCallEnd,
      onReject,
      onError,
    }
    this._call()
    return {
      end: this.initiateCallEnd,
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

  private annot: AnnotationCanvas | null = null

  private _call() {
    if (![CallingState.NoCall, CallingState.Reconnecting].includes(getState().calling)) { return }
    update({ calling: CallingState.Connecting })
    this.getPeer().then(peer => {
      if (!this.callArgs) { return console.log("No call Args. Must not happen.") }
      update({ calling: CallingState.Requesting })

      // TODO: in a proper way
      this.socket && this.socket.emit("_agent_name", store.getState().getIn([ 'user', 'account', 'name']))
      
      const call = this.callConnection = peer.call(this.peerID, this.callArgs.localStream.stream)
      this.callArgs.localStream.onVideoTrack(vTrack => {
        const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
        if (!sender) {
          console.warn("No video sender found")
          return
        }
        //logger.log("sender found:", sender)
        sender.replaceTrack(vTrack)
      })

      call.on('stream', stream => {
        update({ calling: CallingState.OnCall })
        this.callArgs && this.callArgs.onStream(stream)
      });
      //call.peerConnection.addEventListener("track", e => console.log('newtrack',e.track))

      call.on("close", this.onRemoteCallEnd)
      call.on("error", (e) => {
        console.error("PeerJS error (on call):", e)
        this.initiateCallEnd();
        this.callArgs && this.callArgs.onError && this.callArgs.onError();
      });

    })
  }


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


