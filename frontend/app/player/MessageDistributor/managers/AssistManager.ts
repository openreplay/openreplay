import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { TimedMessage } from '../Timed';
import type { Message } from '../messages'
import { ID_TP_MAP } from '../messages';

import { update, getState } from '../../store';


export enum CallingState {
  Requesting,
  True,
  False,
};

export interface State {
  calling: CallingState,
}

export const INITIAL_STATE: State = {
  calling: CallingState.False,
}


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
      this.peer.on('error', e => {
        if (e.type === 'peer-unavailable') {
          this.connectToPeer(); // TODO:  MAX_ATTEMPT_TIME
        } else {
          console.error(`PeerJS error (on peer). Type ${e.type}`, e);
        }
      })
      peer.on("open", me => {
        console.log("peer opened", me);
        this.connectToPeer();        
      });
    });
  }

  private connectToPeer() {
    if (!this.peer) { return; }
    const id = this.peerID;
    console.log("trying to connect to", id)
    const conn = this.peer.connect(id, { serialization: 'json'});

    conn.on('open', () => {
      this.md.setMessagesLoading(false);
      let i = 0;
      console.log("peer connected")

      conn.on('data', (data) => {
        if (typeof data === 'string') { return this.handleCommand(data); }
        if (!Array.isArray(data)) { return; }
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
    conn.on('close', () => {
      this.md.setMessagesLoading(true);
      console.log('closed peer conn. Reconnecting...')
      setTimeout(() => this.connectToPeer(), 300); // reconnect
    });
  }


  private get dataConnection(): DataConnection | null {
    return this.peer?.connections[this.peerID]?.[0] || null;
  }

  private get callConnection(): MediaConnection | null {
    return this.peer?.connections[this.peerID]?.[1] || null;
  } 


  private onCallEnd: null | (()=>void) = null;
  private endCall = () => {
    const conn = this.callConnection;
    if (!conn || !conn.open) { return; }
    conn.close(); //calls onCallEnd twice
    this.dataConnection?.send("call_end"); //
    this.onCallEnd?.();
  }

  private handleCommand(command: string) {
    switch (command) {
      case "call_end":
      console.log("Call end recieved")
        this.endCall();
    }
  }

  //private blocked: boolean = false;
  private onMouseMove = (e: MouseEvent ): void => {
    //if (this.blocked) { return; }
    //this.blocked = true;
    //setTimeout(() => this.blocked = false, 200);
    const conn = this.dataConnection;
    if (!conn || !conn.open) { return; }
    // @ts-ignore ???
    const data = this.md.getInternalCoordinates(e);
    conn.send({ x: Math.round(data.x), y: Math.round(data.y) });
  }

  call(localStream: MediaStream, onStream: (s: MediaStream)=>void, onClose: () => void, onReject: () => void, onError?: ()=> void): null | Function {
    if (!this.peer || getState().calling) { return null; }
    update({ calling: CallingState.Requesting });
        console.log('calling...')
    const call =  this.peer.call(this.peerID, localStream);
    
    let requesting = true;
    call.on('stream', stream => {
      update({ calling: CallingState.True });
      onStream(stream);
      // @ts-ignore ??
      this.md.overlay.addEventListener("click", this.onMouseMove)
    });

    this.onCallEnd = () => {
      if (requesting) {
        requesting = false;
        onReject();
      }
      // @ts-ignore ??
      this.md.overlay.removeEventListener("click",  this.onMouseMove);
      update({ calling: CallingState.True });
      onClose();
    }
    call.on("close", this.onCallEnd);
    call.on("error", (e) => {
      console.error("PeerJS error (on call):", e)
      this.onCallEnd?.();
      onError?.();
    });
    
    return this.endCall;
  }

  clear() {
    this.peer?.destroy();
  }
}


