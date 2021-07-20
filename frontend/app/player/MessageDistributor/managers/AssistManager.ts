import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { TimedMessage } from '../Timed';
import type { Message } from '../messages'
import { ID_TP_MAP } from '../messages';
import store from 'App/store';

import { update, getState } from '../../store';


export enum CallingState {
  Requesting,
  True,
  False,
};

export enum ConnectionStatus {
  Connecting,
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
  }
}
 
export interface State {
  calling: CallingState,
  peerConnectionStatus: ConnectionStatus,
}

export const INITIAL_STATE: State = {
  calling: CallingState.False,
  peerConnectionStatus: ConnectionStatus.Connecting,
}

const MAX_RECONNECTION_COUNT = 4;


function resolveURL(baseURL: string, relURL: string): string {
  if (relURL.startsWith('#') || relURL === "") {
    return relURL;
  }
  return new URL(relURL, baseURL).toString();
}


var match = /bar/.exec("foobar");
const re1 = /url\(("[^"]*"|'[^']*'|[^)]*)\)/g
const re2 = /@import "(.*?)"/g
function cssUrlsIndex(css: string): Array<[number, number]> {
  const idxs: Array<[number, number]> = [];
  const i1 = css.matchAll(re1);
  // @ts-ignore
  for (let m of i1) {
    // @ts-ignore
    const s: number = m.index + m[0].indexOf(m[1]);
    const e: number = s + m[1].length;
    idxs.push([s, e]);
  }
  const i2 = css.matchAll(re2);
  // @ts-ignore
  for (let m of i2) {
    // @ts-ignore
    const s = m.index + m[0].indexOf(m[1]);
    const e = s + m[1].length;
    idxs.push([s, e])
  }
  return idxs;
}
function unquote(str: string): [string, string] {
  str = str.trim();
  if (str.length <= 2) {
    return [str, ""]
  }
  if (str[0] == '"' && str[str.length-1] == '"') {
    return [ str.substring(1, str.length-1), "\""];
  }
  if (str[0] == '\'' && str[str.length-1] == '\'') {
    return [ str.substring(1, str.length-1), "'" ];
  }
  return [str, ""]
}
function rewriteCSSLinks(css: string, rewriter: (rawurl: string) => string): string {
  for (let idx of cssUrlsIndex(css)) {
    const f = idx[0]
    const t = idx[1]
    const [ rawurl, q ] = unquote(css.substring(f, t));
    css = css.substring(0,f) + q + rewriter(rawurl) + q + css.substring(t);
  }
  return css
}

function resolveCSS(baseURL: string, css: string): string {
  return rewriteCSSLinks(css, rawurl => resolveURL(baseURL, rawurl));
}


export default class AssistManager {
  constructor(private session, private md: MessageDistributor) {}

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
    this.md.setMessagesLoading(true);
    import('peerjs').then(({ default: Peer }) => {
      // @ts-ignore
      const peer = new Peer({
        // @ts-ignore
        host: new URL(window.ENV.API_EDP).host,
        path: '/assist',
        port:  location.protocol === 'https:' ? 443 : 80,
      });
      this.peer = peer;
      peer.on('error', e => {
        if (['peer-unavailable', 'network'].includes(e.type)) {
          if (this.peer && this.connectionAttempts++ < MAX_RECONNECTION_COUNT) {
            update({ peerConnectionStatus: ConnectionStatus.Connecting });
            console.log("peerunavailable")
            this.connectToPeer();
          } else {
            update({ peerConnectionStatus: ConnectionStatus.Disconnected });
            this.dataCheckIntervalID && clearInterval(this.dataCheckIntervalID);
          }
        } else {
          console.error(`PeerJS error (on peer). Type ${e.type}`, e);
          update({ peerConnectionStatus: ConnectionStatus.Error })
        }
      })
      peer.on("open", () => {
        if (this.peeropened) { return; }
        this.peeropened = true;
        console.log('peeropen')
        this.connectToPeer();        
      });
    });
  }

  private dataCheckIntervalID: ReturnType<typeof setInterval> | undefined;
  private connectToPeer() {
    if (!this.peer) { return; }
    update({ peerConnectionStatus: ConnectionStatus.Connecting })
    const id = this.peerID;
    console.log("trying to connect to", id)
    const conn = this.peer.connect(id, { serialization: 'json', reliable: true});
    conn.on('open', () => {
      window.addEventListener("beforeunload", ()=>conn.open &&conn.send("unload"));
      console.log("peer connected")
      
      let i = 0;
      let firstMessage = true;

      update({ peerConnectionStatus: ConnectionStatus.Connected })

      conn.on('data', (data) => {
        if (!Array.isArray(data)) { return this.handleCommand(data); }
        this.mesagesRecieved = true;
        if (firstMessage) {
          firstMessage = false;
          this.md.setMessagesLoading(false);
        }

        let time = 0;
        let ts0 = 0;
        (data as Array<Message & { _id: number}>).forEach(msg => {

          // TODO: more appropriate way to do it.
          if (msg._id === 60) {
            // @ts-ignore
            if (msg.name === 'src' || msg.name === 'href') {
                          // @ts-ignore
              msg.value = resolveURL(msg.baseURL, msg.value);
                          // @ts-ignore
            } else if (msg.name === 'style') {
                         // @ts-ignore
              msg.value = resolveCSS(msg.baseURL, msg.value);
            }     
            msg._id = 12;       
          } else if (msg._id === 61) { // "SetCSSDataURLBased"
                          // @ts-ignore
            msg.data = resolveCSS(msg.baseURL, msg.data);
            msg._id = 15;
          } else if (msg._id === 67) { // "insert_rule"
             // @ts-ignore
            msg.rule = resolveCSS(msg.baseURL, msg.rule);
            msg._id = 37;
          }


          msg.tp = ID_TP_MAP[msg._id];  // _id goes from tracker
          
          if (msg.tp === "timestamp") {
            ts0 = ts0 || msg.timestamp
            time = msg.timestamp - ts0;
            return;
          }
          const tMsg: TimedMessage = Object.assign(msg, {
            time,
            _index: i,
          });
          this.md.distributeMessage(tMsg, i++);
        });
      });
    });


    const onDataClose = () => {
      this.initiateCallEnd();
      this.md.setMessagesLoading(true);
      update({ peerConnectionStatus: ConnectionStatus.Connecting });
      console.log('closed peer conn. Reconnecting...')
      this.connectToPeer();
    }

    // this.dataCheckIntervalID = setInterval(() => {
    //   if (!this.dataConnection && getState().peerConnectionStatus === ConnectionStatus.Connected) {
    //     onDataClose();
    //   }
    // }, 3000);
    conn.on('close', onDataClose);// Does it work ?
    conn.on("error", (e) => {
      console.log("PeerJS connection error", e);
      update({ peerConnectionStatus: ConnectionStatus.Error });
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


  private onCallEnd: null | (()=>void) = null;
  private onReject: null | (()=>void) = null;
  private forceCallEnd() {
    this.callConnection?.close();
  }
  private notifyCallEnd() {
    const dataConn = this.dataConnection;
    if (dataConn) {
      console.log("notifyCallEnd send")
      dataConn.send("call_end");
    }
  }
  private initiateCallEnd = () => {
    console.log('initiateCallEnd')
    this.forceCallEnd();
    this.notifyCallEnd();
    this.onCallEnd?.();
  }

  private onTrackerCallEnd = () => {
    this.forceCallEnd();
    if (getState().calling === CallingState.Requesting) {
      this.onReject?.();
    }
    this.onCallEnd?.();
  }



  private mesagesRecieved: boolean = false;
  private handleCommand(command: string) {
    switch (command) {
      case "unload":
        this.onTrackerCallEnd();
        this.mesagesRecieved = false;
        setTimeout(() => {
          if (this.mesagesRecieved) {
            return;
          }
          // @ts-ignore
          this.md.display(false);
          this.dataConnection?.close();
          update({ peerConnectionStatus: ConnectionStatus.Disconnected });
        }, 8000); // TODO: more convenient way
        //this.dataConnection?.close();
        return;
      case "call_end":
        this.onTrackerCallEnd();
        return;
      case "call_error":
        this.onTrackerCallEnd();
        update({ peerConnectionStatus: ConnectionStatus.Error });
        return;
    }
  }

  private onMouseMove = (e: MouseEvent ): void => {
    const conn = this.dataConnection;
    if (!conn) { return; }
    // @ts-ignore ???
    const data = this.md.getInternalCoordinates(e);
    conn.send({ x: Math.round(data.x), y: Math.round(data.y) });
  }

  call(localStream: MediaStream, onStream: (s: MediaStream)=>void, onCallEnd: () => void, onReject: () => void, onError?: ()=> void): null | Function {
    if (!this.peer || getState().calling !== CallingState.False) { return null; }
    
    update({ calling: CallingState.Requesting });
    console.log('calling...')
    
    const call =  this.peer.call(this.peerID, localStream);
    call.on('stream', stream => {
      //call.peerConnection.ontrack = (t)=> console.log('ontrack', t)

      update({ calling: CallingState.True });
      onStream(stream);
      this.send({ 
        name: store.getState().getIn([ 'user', 'account', 'name']),
      });

      // @ts-ignore ??
      this.md.overlay.addEventListener("mousemove", this.onMouseMove)
    });

    this.onCallEnd = () => {
      onCallEnd();
      // @ts-ignore ??
      this.md.overlay.removeEventListener("mousemove",  this.onMouseMove);
      update({ calling: CallingState.False });
      this.onCallEnd = null;
    }

    call.on("close", this.onCallEnd);
    call.on("error", (e) => {
      console.error("PeerJS error (on call):", e)
      this.initiateCallEnd?.();
      onError?.();
    });

    // const intervalID = setInterval(() => {
    //   if (!call.open && getState().calling === CallingState.True) {
    //     this.onCallEnd?.();
    //     clearInterval(intervalID);
    //   }
    // }, 5000);

    window.addEventListener("beforeunload", this.initiateCallEnd)
    
    return this.initiateCallEnd;
  }

  clear() {
    console.log('clearing', this.peerID)
    this.initiateCallEnd();
    this.dataCheckIntervalID && clearInterval(this.dataCheckIntervalID);
    if (this.peer) {
      this.peer.connections[this.peerID]?.forEach(c => c.open && c.close());
      console.log("destroying peer...")
      this.peer.disconnect();
      this.peer.destroy();
      this.peer = null;
    }
  }
}


