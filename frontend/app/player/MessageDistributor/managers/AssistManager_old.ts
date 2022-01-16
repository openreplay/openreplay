// import type Peer from 'peerjs';
// import type { DataConnection, MediaConnection } from 'peerjs';
// import type MessageDistributor from '../MessageDistributor';
// import type { Message } from '../messages'
// import store from 'App/store';
// import type { LocalStream } from './LocalStream';
// import { update, getState } from '../../store';
// import { iceServerConfigFromString } from 'App/utils'


// export enum CallingState {
//   Reconnecting,
//   Requesting,
//   True,
//   False,
// };

// export enum ConnectionStatus {
//   Connecting,
//   WaitingMessages,
//   Connected,
//   Inactive,
//   Disconnected,
//   Error,
// };


// export function getStatusText(status: ConnectionStatus): string {
//   switch(status) {
//     case ConnectionStatus.Connecting:
//       return "Connecting...";
//     case ConnectionStatus.Connected:
//       return "";
//     case ConnectionStatus.Inactive:
//       return "Client tab is inactive";
//     case ConnectionStatus.Disconnected:
//       return "Disconnected";
//     case ConnectionStatus.Error:
//       return "Something went wrong. Try to reload the page.";
//     case ConnectionStatus.WaitingMessages:
//       return "Connected. Waiting for the data... (The tab might be inactive)"
//   }
// }
 
// export interface State {
//   calling: CallingState,
//   peerConnectionStatus: ConnectionStatus,
//   remoteControl: boolean,
// }

// export const INITIAL_STATE: State = {
//   calling: CallingState.False,
//   peerConnectionStatus: ConnectionStatus.Connecting,
//   remoteControl: false,
// }

// const MAX_RECONNECTION_COUNT = 4;


// function resolveURL(baseURL: string, relURL: string): string {
//   if (relURL.startsWith('#') || relURL === "") {
//     return relURL;
//   }
//   return new URL(relURL, baseURL).toString();
// }


// var match = /bar/.exec("foobar");
// const re1 = /url\(("[^"]*"|'[^']*'|[^)]*)\)/g
// const re2 = /@import "(.*?)"/g
// function cssUrlsIndex(css: string): Array<[number, number]> {
//   const idxs: Array<[number, number]> = [];
//   const i1 = css.matchAll(re1);
//   // @ts-ignore
//   for (let m of i1) {
//     // @ts-ignore
//     const s: number = m.index + m[0].indexOf(m[1]);
//     const e: number = s + m[1].length;
//     idxs.push([s, e]);
//   }
//   const i2 = css.matchAll(re2);
//   // @ts-ignore
//   for (let m of i2) {
//     // @ts-ignore
//     const s = m.index + m[0].indexOf(m[1]);
//     const e = s + m[1].length;
//     idxs.push([s, e])
//   }
//   return idxs;
// }
// function unquote(str: string): [string, string] {
//   str = str.trim();
//   if (str.length <= 2) {
//     return [str, ""]
//   }
//   if (str[0] == '"' && str[str.length-1] == '"') {
//     return [ str.substring(1, str.length-1), "\""];
//   }
//   if (str[0] == '\'' && str[str.length-1] == '\'') {
//     return [ str.substring(1, str.length-1), "'" ];
//   }
//   return [str, ""]
// }
// function rewriteCSSLinks(css: string, rewriter: (rawurl: string) => string): string {
//   for (let idx of cssUrlsIndex(css)) {
//     const f = idx[0]
//     const t = idx[1]
//     const [ rawurl, q ] = unquote(css.substring(f, t));
//     css = css.substring(0,f) + q + rewriter(rawurl) + q + css.substring(t);
//   }
//   return css
// }

// function resolveCSS(baseURL: string, css: string): string {
//   return rewriteCSSLinks(css, rawurl => resolveURL(baseURL, rawurl));
// }

// export default class AssistManager {
//   constructor(private session, private md: MessageDistributor, private config) {}

//   private setStatus(status: ConnectionStatus) {
//     if (status === ConnectionStatus.Connecting) {
//       this.md.setMessagesLoading(true);
//     } else {
//       this.md.setMessagesLoading(false);
//     }
//     if (status === ConnectionStatus.Connected) {
//       this.md.display(true);
//     } else {
//       this.md.display(false);
//     }
//     update({ peerConnectionStatus: status });
//   }

//   private get peerID(): string {
//     return `${this.session.projectKey}-${this.session.sessionId}`
//   }

//   private peer: Peer | null = null;
//   connectionAttempts: number = 0;
//   private peeropened: boolean = false;
//   connect() {
//     if (this.peer != null) {
//       console.error("AssistManager: trying to connect more than once");
//       return;
//     }
//     this.setStatus(ConnectionStatus.Connecting)
//     import('peerjs').then(({ default: Peer }) => {
//       const _config = {
//         // @ts-ignore
//         host: new URL(window.ENV.API_EDP).host,
//         path: '/assist',
//         port:  location.protocol === 'https:' ? 443 : 80,
//       }

//       if (this.config) {
//         _config['config'] = {
//           iceServers: this.config,
//           sdpSemantics: 'unified-plan',
//           iceTransportPolicy: 'relay',
//         };
//       }

//       const peer = new Peer(_config);
//       this.peer = peer;
//       peer.on('error', e => {
//         if (e.type !== 'peer-unavailable') {
//           console.warn("AssistManager PeerJS peer error: ", e.type, e)
//         }
//         if (['peer-unavailable', 'network', 'webrtc'].includes(e.type)) {
//           if (this.peer && this.connectionAttempts++ < MAX_RECONNECTION_COUNT) {
//             this.setStatus(ConnectionStatus.Connecting);
//             this.connectToPeer();
//           } else {
//             this.setStatus(ConnectionStatus.Disconnected);
//             this.dataCheckIntervalID && clearInterval(this.dataCheckIntervalID);
//           }
//         } else {
//           console.error(`PeerJS error (on peer). Type ${e.type}`, e);
//           this.setStatus(ConnectionStatus.Error)
//         }
//       })
//       peer.on("open", () => {
//         if (this.peeropened) { return; }
//         this.peeropened = true;
//         this.connectToPeer();        
//       });
//     });
//   }

//   private dataCheckIntervalID: ReturnType<typeof setInterval> | undefined;
//   private connectToPeer() {
//     if (!this.peer) { return; }
//     this.setStatus(ConnectionStatus.Connecting);
//     const id = this.peerID;
//     const conn = this.peer.connect(id, { serialization: 'json', reliable: true});
//     conn.on('open', () => {
//       window.addEventListener("beforeunload", ()=>conn.open &&conn.send("unload"));

//       //console.log("peer connected")


//       if (getState().calling === CallingState.Reconnecting) {
//         this._call()
//       }
      
//       let i = 0;
//       let firstMessage = true;

//       this.setStatus(ConnectionStatus.WaitingMessages)

//       conn.on('data', (data) => {
//         if (!Array.isArray(data)) { return this.handleCommand(data); }
//         this.disconnectTimeout && clearTimeout(this.disconnectTimeout);
//         if (firstMessage) {
//           firstMessage = false;
//           this.setStatus(ConnectionStatus.Connected)
//         }

//         let time = 0;
//         let ts0 = 0;
//         (data as Array<Message & { _id: number}>).forEach(msg => {

//           // TODO: more appropriate way to do it.
//           if (msg._id === 60) {
//             // @ts-ignore
//             if (msg.name === 'src' || msg.name === 'href') {
//                           // @ts-ignore
//               msg.value = resolveURL(msg.baseURL, msg.value);
//                           // @ts-ignore
//             } else if (msg.name === 'style') {
//                          // @ts-ignore
//               msg.value = resolveCSS(msg.baseURL, msg.value);
//             }     
//             msg._id = 12;       
//           } else if (msg._id === 61) { // "SetCSSDataURLBased"
//                           // @ts-ignore
//             msg.data = resolveCSS(msg.baseURL, msg.data);
//             msg._id = 15;
//           } else if (msg._id === 67) { // "insert_rule"
//              // @ts-ignore
//             msg.rule = resolveCSS(msg.baseURL, msg.rule);
//             msg._id = 37;
//           }


//           msg.tp = ID_TP_MAP[msg._id];  // _id goes from tracker
          
//           if (msg.tp === "timestamp") {
//             ts0 = ts0 || msg.timestamp
//             time = msg.timestamp - ts0;
//             return;
//           }
//           const tMsg: TimedMessage = Object.assign(msg, {
//             time,
//             _index: i,
//           });
//           this.md.distributeMessage(tMsg, i++);
//         });
//       });
//     });


//     const onDataClose = () => {
//       this.onCallDisconnect()
//       //console.log('closed peer conn. Reconnecting...')
//       this.connectToPeer();
//     }

//     // this.dataCheckIntervalID = setInterval(() => {
//     //   if (!this.dataConnection && getState().peerConnectionStatus === ConnectionStatus.Connected) {
//     //     onDataClose();
//     //   }
//     // }, 3000);
//     conn.on('close', onDataClose);// Does it work ?
//     conn.on("error", (e) => {
//       this.setStatus(ConnectionStatus.Error);
//     })
//   }


//   private get dataConnection(): DataConnection | undefined {
//     return this.peer?.connections[this.peerID]?.find(c => c.type === 'data' && c.open);
//   }

//   private get callConnection(): MediaConnection | undefined {
//     return this.peer?.connections[this.peerID]?.find(c => c.type === 'media' && c.open);
//   } 

//   private send(data: any) {
//     this.dataConnection?.send(data);
//   }


//   private forceCallEnd() {
//     this.callConnection?.close();
//   }
//   private notifyCallEnd() {
//     const dataConn = this.dataConnection;
//     if (dataConn) {
//       dataConn.send("call_end");
//     }
//   }
//   private initiateCallEnd = () => {
//     this.forceCallEnd();
//     this.notifyCallEnd();
//     this.localCallData && this.localCallData.onCallEnd();
//   }

//   private onTrackerCallEnd = () => {
//     console.log('onTrackerCallEnd')
//     this.forceCallEnd();
//     if (getState().calling === CallingState.Requesting) {
//       this.localCallData && this.localCallData.onReject();
//     }
//     this.localCallData && this.localCallData.onCallEnd();
//   }

//   private onCallDisconnect = () => {
//     if (getState().calling === CallingState.True) {
//       update({ calling: CallingState.Reconnecting });
//     }
//   }


//   private disconnectTimeout: ReturnType<typeof setTimeout> | undefined;
//   private handleCommand(command: string) {
//     console.log("Data command", command)
//     switch (command) {
//       case "unload":
//         //this.onTrackerCallEnd();
//         this.onCallDisconnect()
//         this.dataConnection?.close();
//         this.disconnectTimeout = setTimeout(() => {
//           this.onTrackerCallEnd();
//           this.setStatus(ConnectionStatus.Disconnected);
//         }, 15000); // TODO: more convenient way
//         //this.dataConnection?.close();
//         return;
//       case "call_end":
//         this.onTrackerCallEnd();
//         return;
//       case "call_error":
//         this.onTrackerCallEnd();
//         this.setStatus(ConnectionStatus.Error);
//         return;
//     }
//   }

//   // private mmtid?:ReturnType<typeof setTimeout>
//   private onMouseMove = (e: MouseEvent): void => {
//     // this.mmtid && clearTimeout(this.mmtid)
//     // this.mmtid = setTimeout(() => {
//     const data = this.md.getInternalCoordinates(e);
//     this.send({ x: Math.round(data.x), y: Math.round(data.y) });
//     // }, 5)
//   }


//   // private wtid?: ReturnType<typeof setTimeout>
//   // private scrollDelta: [number, number] = [0,0]
//   private onWheel = (e: WheelEvent): void => {
//     e.preventDefault()
//     //throttling makes movements less smooth
//     // this.wtid && clearTimeout(this.wtid)
//     // this.scrollDelta[0] += e.deltaX
//     // this.scrollDelta[1] += e.deltaY
//     // this.wtid = setTimeout(() => {
//     this.send({ type: "scroll",  delta: [ e.deltaX, e.deltaY ]})//this.scrollDelta });
//     this.onMouseMove(e)
//     //   this.scrollDelta = [0,0]
//     // }, 20)
//   }

//   private onMouseClick = (e: MouseEvent): void => {
//     const conn = this.dataConnection;
//     if (!conn) { return; }
//     const data = this.md.getInternalCoordinates(e);
//     // const el = this.md.getElementFromPoint(e); // requires requestiong node_id from domManager
//     const el = this.md.getElementFromInternalPoint(data)
//     if (el instanceof HTMLElement) {
//       el.focus()
//       el.oninput = e => e.preventDefault();
//       el.onkeydown = e => e.preventDefault();
//     }
//     conn.send({ type: "click",  x: Math.round(data.x), y: Math.round(data.y) });
//   }

//   private toggleRemoteControl = (flag?: boolean) => {
//     const state = getState().remoteControl;
//     const newState = typeof flag === 'boolean' ? flag : !state;
//     if (state === newState) { return }
//     if (newState) {
//       this.md.overlay.addEventListener("click", this.onMouseClick);
//       this.md.overlay.addEventListener("wheel", this.onWheel)
//       update({ remoteControl: true })
//     } else {
//       this.md.overlay.removeEventListener("click", this.onMouseClick);
//       this.md.overlay.removeEventListener("wheel", this.onWheel);
//       update({ remoteControl: false })
//     }
//   }

//   private localCallData: {
//     localStream: LocalStream,
//     onStream: (s: MediaStream)=>void,
//     onCallEnd: () => void,
//     onReject: () => void, 
//     onError?: ()=> void
//   } | null = null

//   call(localStream: LocalStream, onStream: (s: MediaStream)=>void, onCallEnd: () => void, onReject: () => void, onError?: ()=> void): { end: Function, toggleRemoteControl: Function } {
//     this.localCallData = {
//       localStream,
//       onStream,
//       onCallEnd: () => {
//         onCallEnd();
//         this.toggleRemoteControl(false);
//         this.md.overlay.removeEventListener("mousemove",  this.onMouseMove);
//         this.md.overlay.removeEventListener("click",  this.onMouseClick);
//         update({ calling: CallingState.False });
//         this.localCallData = null;
//       },
//       onReject,
//       onError,
//     }
//     this._call()
//     return {
//       end: this.initiateCallEnd,
//       toggleRemoteControl: this.toggleRemoteControl,
//     }
//   }

//   private _call() {
//     if (!this.peer || !this.localCallData || ![CallingState.False, CallingState.Reconnecting].includes(getState().calling)) { return null; }
    
//     update({ calling: CallingState.Requesting });

//     //console.log('calling...', this.localCallData.localStream)
    
//     const call =  this.peer.call(this.peerID, this.localCallData.localStream.stream);
//     this.localCallData.localStream.onVideoTrack(vTrack => {
//       const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
//       if (!sender) {
//         //logger.warn("No video sender found")
//         return
//       }
//       //logger.log("sender found:", sender)
//       sender.replaceTrack(vTrack)
//     })

//     call.on('stream', stream => {
//       update({ calling: CallingState.True });
//       this.localCallData && this.localCallData.onStream(stream);
//       this.send({ 
//         name: store.getState().getIn([ 'user', 'account', 'name']),
//       });

//       this.md.overlay.addEventListener("mousemove", this.onMouseMove)
//       // this.md.overlay.addEventListener("click", this.onMouseClick)
//     });
//     //call.peerConnection.addEventListener("track", e => console.log('newtrack',e.track))

//     call.on("close", this.localCallData.onCallEnd);
//     call.on("error", (e) => {
//       console.error("PeerJS error (on call):", e)
//       this.initiateCallEnd();
//       this.localCallData && this.localCallData.onError && this.localCallData.onError();
//     });

//     window.addEventListener("beforeunload", this.initiateCallEnd)
//   }

//   clear() {
//     this.initiateCallEnd();
//     this.dataCheckIntervalID && clearInterval(this.dataCheckIntervalID);
//     if (this.peer) {
//       //console.log("destroying peer...")
//       const peer = this.peer; // otherwise it calls reconnection on data chan close
//       this.peer = null;
//       peer.destroy();
//     }
//   }
// }


