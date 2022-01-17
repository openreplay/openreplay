import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { Message } from '../messages'
import store from 'App/store';
import type { LocalStream } from './LocalStream';
import { update, getState } from '../../store';
import { iceServerConfigFromString } from 'App/utils'

import MStreamReader from '../messages/MStreamReader';;
import JSONRawMessageReader from '../messages/JSONRawMessageReader'

export enum CallingState {
  Reconnecting,
  Requesting,
  True,
  False,
};

export enum ConnectionStatus {
  Connecting,
  WaitingMessages,
  Connected,
  Inactive,
  Disconnected,
  Error,
};


export function getStatusText(status: ConnectionStatus): string {
  switch(status) {
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
  remoteControl: boolean,
}

export const INITIAL_STATE: State = {
  calling: CallingState.False,
  peerConnectionStatus: ConnectionStatus.Connecting,
  remoteControl: false,
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

  private peer: Peer | null = null;
  connectionAttempts: number = 0;
  private peeropened: boolean = false;
  connect() {
    if (this.peer != null) {
      console.error("AssistManager: trying to connect more than once");
      return;
    }
    this.setStatus(ConnectionStatus.Connecting)
    // @ts-ignore
    const urlObject = new URL(window.ENV.API_EDP)
    import('peerjs').then(({ default: Peer }) => {
      if (this.closed) {return}
      const _config = {
        host: urlObject.hostname,
        path: '/assist',
        port: urlObject.port === "" ? (location.protocol === 'https:' ? 443 : 80 ): parseInt(urlObject.port),
      }

      if (this.config) {
        _config['config'] = {
          iceServers: this.config,
          sdpSemantics: 'unified-plan',
          iceTransportPolicy: 'relay',
        };
      }

      const peer = new Peer(_config);
      this.peer = peer;
      peer.on('error', e => {
        if (e.type !== 'peer-unavailable') {
          console.warn("AssistManager PeerJS peer error: ", e.type, e)
        }
        if (['peer-unavailable', 'network', 'webrtc'].includes(e.type)) {
          if (this.peer) {
            this.setStatus(this.connectionAttempts++ < MAX_RECONNECTION_COUNT 
              ? ConnectionStatus.Connecting
              : ConnectionStatus.Disconnected);
            this.connectToPeer();
          }
        } else {
          console.error(`PeerJS error (on peer). Type ${e.type}`, e);
          this.setStatus(ConnectionStatus.Error)
        }
      })
      peer.on("open", () => {
        if (this.peeropened) { return; }
        this.peeropened = true;
        this.connectToPeer();        
      });
    });
  }

  private connectToPeer() {
    if (!this.peer) { return; }
    this.setStatus(ConnectionStatus.Connecting);
    const id = this.peerID;
    const conn = this.peer.connect(id, { serialization: "json", reliable: true});
    conn.on('open', () => {
      window.addEventListener("beforeunload", ()=>conn.open &&conn.send("unload"));

      //console.log("peer connected")


      if (getState().calling === CallingState.Reconnecting) {
        this._call()
      }
      
      let firstMessage = true;

      this.setStatus(ConnectionStatus.WaitingMessages)

      const jmr = new JSONRawMessageReader()
      const reader = new MStreamReader(jmr)

      conn.on('data', (data) => {
        this.disconnectTimeout && clearTimeout(this.disconnectTimeout);


        if (Array.isArray(data)) {
          jmr.append(data) // as RawMessage[]
        } else if (data instanceof ArrayBuffer) {
          //rawMessageReader.append(new Uint8Array(data))
        } else { return this.handleCommand(data); }
        
        if (firstMessage) {
          firstMessage = false;
          this.setStatus(ConnectionStatus.Connected)
        }

        for (let msg = reader.readNext();msg !== null;msg = reader.readNext()) {
          //@ts-ignore
          this.md.distributeMessage(msg, msg._index);
        }
      });
    });


    const onDataClose = () => {
      this.onCallDisconnect()
      this.connectToPeer();
    }

    conn.on('close', onDataClose);// What case does it work ?
    conn.on("error", (e) => {
      this.setStatus(ConnectionStatus.Error);
    })
  }


  private get dataConnection(): DataConnection | undefined {
    return this.peer?.connections[this.peerID]?.find(c => c.type === 'data' && c.open);
  }
  private get callConnection(): MediaConnection | undefined {
    return this.peer?.connections[this.peerID]?.find(c => c.type === 'media' && c.open);
  } 
  private send(data: any) {
    this.dataConnection?.send(data);
  }


  private forceCallEnd() {
    this.callConnection?.close();
  }
  private notifyCallEnd() {
    const dataConn = this.dataConnection;
    if (dataConn) {
      dataConn.send("call_end");
    }
  }
  private initiateCallEnd = () => {
    this.forceCallEnd();
    this.notifyCallEnd();
    this.localCallData && this.localCallData.onCallEnd();
  }

  private onTrackerCallEnd = () => {
    console.log('onTrackerCallEnd')
    this.forceCallEnd();
    if (getState().calling === CallingState.Requesting) {
      this.localCallData && this.localCallData.onReject();
    }
    this.localCallData && this.localCallData.onCallEnd();
  }

  private onCallDisconnect = () => {
    if (getState().calling === CallingState.True) {
      update({ calling: CallingState.Reconnecting });
    }
  }


  private disconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private closeDataConnectionTimeout:  ReturnType<typeof setTimeout> | undefined;
  private handleCommand(command: string) {
    console.log("Data command", command)
    switch (command) {
      case "unload":
        //this.onTrackerCallEnd();
        this.closeDataConnectionTimeout = setTimeout(() => {
          this.onCallDisconnect()
          this.dataConnection?.close();
        }, 1500);
        this.disconnectTimeout = setTimeout(() => {
          this.onTrackerCallEnd();
          this.setStatus(ConnectionStatus.Disconnected);
        }, 15000); // TODO: more convenient way
        return;
      case "call_end":
        this.onTrackerCallEnd();
        return;
      case "call_error":
        this.onTrackerCallEnd();
        this.setStatus(ConnectionStatus.Error);
        return;
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    const data = this.md.getInternalCoordinates(e);
    this.send({ x: Math.round(data.x), y: Math.round(data.y) });
  }


  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    //throttling makes movements less smooth, so it is omitted
    //this.onMouseMove(e)
    this.send({ type: "scroll",  delta: [ e.deltaX, e.deltaY ]})
  }

  private onMouseClick = (e: MouseEvent): void => {
    const conn = this.dataConnection;
    if (!conn) { return; }
    const data = this.md.getInternalCoordinates(e);
    // const el = this.md.getElementFromPoint(e); // requires requestiong node_id from domManager
    const el = this.md.getElementFromInternalPoint(data)
    if (el instanceof HTMLElement) {
      el.focus()
      el.oninput = e => e.preventDefault();
      el.onkeydown = e => e.preventDefault();
    }
    conn.send({ type: "click",  x: Math.round(data.x), y: Math.round(data.y) });
  }

  private toggleRemoteControl = (flag?: boolean) => {
    const state = getState().remoteControl;
    const newState = typeof flag === 'boolean' ? flag : !state;
    if (state === newState) { return }
    if (newState) {
      this.md.overlay.addEventListener("click", this.onMouseClick);
      this.md.overlay.addEventListener("wheel", this.onWheel)
      update({ remoteControl: true })
    } else {
      this.md.overlay.removeEventListener("click", this.onMouseClick);
      this.md.overlay.removeEventListener("wheel", this.onWheel);
      update({ remoteControl: false })
    }
  }

  private localCallData: {
    localStream: LocalStream,
    onStream: (s: MediaStream)=>void,
    onCallEnd: () => void,
    onReject: () => void, 
    onError?: ()=> void
  } | null = null

  call(localStream: LocalStream, onStream: (s: MediaStream)=>void, onCallEnd: () => void, onReject: () => void, onError?: ()=> void): { end: Function, toggleRemoteControl: Function } {
    this.localCallData = {
      localStream,
      onStream,
      onCallEnd: () => {
        onCallEnd();
        this.toggleRemoteControl(false);
        this.md.overlay.removeEventListener("mousemove",  this.onMouseMove);
        this.md.overlay.removeEventListener("click",  this.onMouseClick);
        update({ calling: CallingState.False });
        this.localCallData = null;
      },
      onReject,
      onError,
    }
    this._call()
    return {
      end: this.initiateCallEnd,
      toggleRemoteControl: this.toggleRemoteControl,
    }
  }

  private _call() {
    if (!this.peer || !this.localCallData || ![CallingState.False, CallingState.Reconnecting].includes(getState().calling)) { return null; }
    
    update({ calling: CallingState.Requesting });

    //console.log('calling...', this.localCallData.localStream)
    
    const call =  this.peer.call(this.peerID, this.localCallData.localStream.stream);
    this.localCallData.localStream.onVideoTrack(vTrack => {
      const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
      if (!sender) {
        //logger.warn("No video sender found")
        return
      }
      //logger.log("sender found:", sender)
      sender.replaceTrack(vTrack)
    })

    call.on('stream', stream => {
      update({ calling: CallingState.True });
      this.localCallData && this.localCallData.onStream(stream);
      this.send({ 
        name: store.getState().getIn([ 'user', 'account', 'name']),
      });

      this.md.overlay.addEventListener("mousemove", this.onMouseMove)
      this.md.overlay.addEventListener("click", this.onMouseClick)
    });
    //call.peerConnection.addEventListener("track", e => console.log('newtrack',e.track))

    call.on("close", this.localCallData.onCallEnd);
    call.on("error", (e) => {
      console.error("PeerJS error (on call):", e)
      this.initiateCallEnd();
      this.localCallData && this.localCallData.onError && this.localCallData.onError();
    });

    window.addEventListener("beforeunload", this.initiateCallEnd)
  }

  closed = false
  clear() {
    this.closed =true
    this.initiateCallEnd();
    if (this.peer) {
      console.log("destroying peer...")
      const peer = this.peer; // otherwise it calls reconnection on data chan close
      this.peer = null;
      peer.disconnect();
      peer.destroy();
    }
  }
}


