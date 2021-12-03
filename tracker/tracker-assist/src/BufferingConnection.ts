import type { DataConnection } from 'peerjs';

// TODO: proper Message type export from tracker in 3.5.0
interface Message {
  encode(w: any): boolean;
}

// 16kb should be max according to specification
const crOrFf: boolean = 
  typeof navigator !== "undefined" && 
  (navigator.userAgent.indexOf("Chrom") !== -1 ||  // Chrome && Chromium
  navigator.userAgent.indexOf("Firefox") !== -1);

const MESSAGES_PER_SEND = crOrFf ? 500 : 100

// Bffering required in case of webRTC
export default class BufferingConnection {
  private readonly buffer: Message[][] = []
  private buffering: boolean = false

  constructor(readonly conn: DataConnection, 
    private readonly msgsPerSend: number = MESSAGES_PER_SEND){}
  private sendNext() {
    if (this.buffer.length) {
      setTimeout(() => {
        this.conn.send(this.buffer.shift())
        this.sendNext()
      }, 15)
    } else {
      this.buffering = false
    }
  }

  send(messages: Message[]) {
    if (!this.conn.open) { return; }
    let i = 0;
    while (i < messages.length) {
      this.buffer.push(messages.slice(i, i+=this.msgsPerSend))
    }
    if (!this.buffering) { 
      this.buffering = true
      this.sendNext();
    }
  }
}