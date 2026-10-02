import type { Socket as SocketIO } from 'socket.io-client';

export interface Socket {
  emit: SocketIO['emit'];
  on: SocketIO['on'];
  off: SocketIO['off'];
  id: SocketIO['id'];
}
