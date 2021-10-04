import type { DataConnection } from 'peerjs';

// TODO: proper Message type export from tracker in 3.5.0
interface Message {
  encode(w: any): boolean;
}

// Bffering required in case of webRTC
export default class BufferingConnection {
  private readonly buffer: Message[][] = []
  private buffering: boolean = false

  constructor(readonly conn: DataConnection){}
  private sendNext() {
    if (this.buffer.length) {
      setTimeout(() => {
        this.conn.send(this.buffer.shift())
        this.sendNext()
      }, 50)
    } else {
      this.buffering = false
    }
  }

  send(messages: Message[]) {
    if (!this.conn.open) { return; }
    let i = 0;
    while (i < messages.length) {
      this.buffer.push(messages.slice(i, i+=1000))
    }
    if (!this.buffering) { 
      this.buffering = true
      this.sendNext();
    }
  }
}