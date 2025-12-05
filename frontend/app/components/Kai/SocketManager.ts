import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { ISession } from '@/types/session/session';
import ENV from '../../../env';

export class ChatManager {
  socket: ReturnType<typeof io>;
  threadId: string | null = null;

  constructor({
    projectId,
    threadId,
    token,
  }: {
    projectId: string;
    threadId: string;
    token: string;
  }) {
    this.threadId = threadId;
    const urlObject = new URL(ENV.API_EDP || window.location.origin);
    const socket = io(`${urlObject.origin}/kai/chat`, {
      transports: ['websocket'],
      path: '/kai/chat/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      multiplex: true,
      query: {
        project_id: projectId,
        thread_id: threadId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      auth: {
        token: `Bearer ${token}`,
      },
    });
    socket.on('connect', () => {
      console.log('Connected to server');
    });
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    socket.on('error', (err) => {
      if (err.message) {
        toast.error(err.message);
      }
      console.error('Socket error:', err);
    });

    this.socket = socket;
  }

  reconnect = () => {
    this.socket.connect();
  };

  sendMessage = (message: string, isReplace = false) => {
    if (!this.socket.connected) {
      this.reconnect();
      setTimeout(() => {
        this.sendMessage(message, isReplace);
      }, 500);
    } else {
      this.socket.emit(
        'message',
        JSON.stringify({
          message,
          threadId: this.threadId,
          replace: isReplace,
        }),
      );
    }
  };

  setOnMsgHook = ({
    msgCallback,
    titleCallback,
  }: {
    msgCallback: (msg: StateEvent | BotChunk) => void;
    titleCallback: (title: string) => void;
  }) => {
    this.socket.on('chunk', (msg: BotChunk) => {
      msgCallback({ ...msg, type: 'chunk' });
    });
    this.socket.on('title', (msg: { content: string }) => {
      titleCallback(msg.content);
    });
    this.socket.on(
      'state',
      (state: { message: 'idle' | 'running'; start_time: number }) => {
        msgCallback({
          state: state.message,
          type: 'state',
          start_time: state.start_time,
        });
      },
    );
  };

  disconnect = () => {
    this.socket.disconnect();
  };
}

export interface BotChunk {
  stage: 'start' | 'chart' | 'final' | 'title';
  content: string;
  messageId: string;
  duration: number;
  supports_visualization: boolean;
  sessions?: ISession[];
  type: 'chunk';
}

interface StateEvent {
  state: string;
  start_time?: number;
  type: 'state';
}
