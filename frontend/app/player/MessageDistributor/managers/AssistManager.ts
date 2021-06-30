import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type MessageDistributor from '../MessageDistributor';
import type { TimedMessage } from '../Timed';
import type { Message } from '../messages'
import { ID_TP_MAP } from '../messages';



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
        port: 80,
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
    const conn = this.peer.connect(id);

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

  private onMouseMoveShare = (e: MouseEvent ): void => {
    const conn = this.dataConnection;
    if (!conn || !conn.open) { return; }
    // @ts-ignore ???
    const data = this.md._getInternalCoordinates(e);
    conn.send({ x: Math.round(data.x), y: Math.round(data.y) }); // debounce?
  }

  private calling: boolean = false;
  call(localStream: MediaStream, onStream: (s: MediaStream)=>void, onClose: () => void, onError?: ()=> void): null | Function {
    if (!this.peer || this.calling) { return null; }
    const call =  this.peer.call(this.peerID, localStream);

    console.log('calling...')

    this.calling = true;
    call.on('stream', stream => {
      onStream(stream);
      // @ts-ignore ??
      this.md.overlay.addEventListener("mousemove", this.onMouseMoveShare)
    });

    this.onCallEnd = () => {
      // @ts-ignore ??
      this.md.overlay.removeEventListener("mousemove",  this.onMouseMoveShare);
      this.calling = false;
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
