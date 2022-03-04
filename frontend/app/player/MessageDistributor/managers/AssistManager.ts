import type { Socket } from 'socket.io-client';
import type Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { Message } from '../messages'
import store from 'App/store';
import type { LocalStream } from './LocalStream';
import { update, getState } from '../../store';
import { iceServerConfigFromString } from 'App/utils'

import MStreamReader from '../messages/MStreamReader';;
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
}

export const INITIAL_STATE: State = {
  calling: CallingState.NoCall,
  peerConnectionStatus: ConnectionStatus.Connecting,
  remoteControl: RemoteControlStatus.Disabled,
}

const MAX_RECONNECTION_COUNT = 4;


export default class AssistManager {
  constructor(private session, private md: MessageDistributor, private config) {}

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

  private onVisChange = () => {
    let inactiveTimeout: ReturnType<typeof setTimeout> | undefined
    if (document.hidden) {
      inactiveTimeout = setTimeout(() => {
        if (document.hidden && getState().calling === CallingState.NoCall) {
          this.socket?.close()
        }
      }, 30000)
    } else {
      inactiveTimeout && clearTimeout(inactiveTimeout)
      this.socket?.open()
    }
  }

  private socket: Socket | null = null
  connect() {
    const jmr = new JSONRawMessageReader()
    const reader = new MStreamReader(jmr)
    let waitingForMessages = true
    let showDisconnectTimeout: ReturnType<typeof setTimeout> | undefined
    import('socket.io-client').then(({ default: io }) => {
      if (this.cleaned) { return }
      if (this.socket) { this.socket.close() } // TODO: single socket connection
      // @ts-ignore
      const urlObject = new URL(window.ENV.API_EDP) // does it handle ssl automatically?

      // @ts-ignore WTF, socket.io ???
      const socket: Socket = this.socket = io(urlObject.origin, {
        path: '/ws-assist/socket',
        query: {
          peerId: this.peerID,
          identity: "agent",
          //agentInfo: JSON.stringify({})
        }
      })
      //socket.onAny((...args) => console.log(...args))
      socket.on("connect", () => {
        waitingForMessages = true
        this.setStatus(ConnectionStatus.WaitingMessages)
      })
      socket.on("disconnect", () => {
        this.toggleRemoteControl(false)
      })
      socket.on('messages', messages => {
        showDisconnectTimeout && clearTimeout(showDisconnectTimeout);
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
      socket.on('SESSION_DISCONNECTED', e => {
        waitingForMessages = true
        showDisconnectTimeout = setTimeout(() => {
          if (this.cleaned) { return }
          this.setStatus(ConnectionStatus.Disconnected)
        }, 12000)

        if (getState().remoteControl === RemoteControlStatus.Requesting ||
        getState().remoteControl === RemoteControlStatus.Enabled) {
          this.toggleRemoteControl(false)
        }

        // Call State
        if (getState().calling === CallingState.OnCall) {
          update({ calling: CallingState.Reconnecting })
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
    this.socket.emit("move", [ Math.round(data.x), Math.round(data.y) ])
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
    const data = this.md.getInternalViewportCoordinates(e);
    // const el = this.md.getElementFromPoint(e); // requires requestiong node_id from domManager
    const el = this.md.getElementFromInternalPoint(data)
    if (el instanceof HTMLElement) {
      el.focus()
      el.oninput = e => e.preventDefault();
      el.onkeydown = e => e.preventDefault();
    }
    this.socket.emit("click",  [ Math.round(data.x), Math.round(data.y) ]);
  }

  private toggleRemoteControl(newState: boolean){
    if (newState) {
      this.md.overlay.addEventListener("mousemove", this.onMouseMove)
      this.md.overlay.addEventListener("click", this.onMouseClick)
      this.md.overlay.addEventListener("wheel", this.onWheel)
      update({ remoteControl: RemoteControlStatus.Enabled })
    } else {
      this.md.overlay.removeEventListener("mousemove", this.onMouseMove)
      this.md.overlay.removeEventListener("click", this.onMouseClick)
      this.md.overlay.removeEventListener("wheel", this.onWheel)
      update({ remoteControl: RemoteControlStatus.Disabled })
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
    const urlObject = new URL(window.ENV.API_EDP)
    return import('peerjs').then(({ default: Peer }) => {
      if (this.cleaned) {return Promise.reject("Already cleaned")}
      const peerOpts = {
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
  }
}


