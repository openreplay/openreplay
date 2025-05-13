import io from 'socket.io-client';

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
    const urlObject = new URL(window.env.API_EDP || window.location.origin);
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
      console.error('Socket error:', err);
    });

    this.socket = socket;
  }

  sendMessage = (message: string, isReplace = false) => {
    this.socket.emit(
      'message',
      JSON.stringify({
        message,
        threadId: this.threadId,
        replace: isReplace,
      }),
    );
  };

  setOnMsgHook = ({
    msgCallback,
    titleCallback,
  }: {
    msgCallback: (
      msg: BotChunk | { state: string; type: 'state'; start_time?: number },
    ) => void;
    titleCallback: (title: string) => void;
  }) => {
    this.socket.on('chunk', (msg: BotChunk) => {
      msgCallback(msg);
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
  duration?: number;
}
export interface Message {
  text: string;
  isUser: boolean;
  messageId: string;
  duration?: number;
  feedback: boolean | null;
}

export interface SentMessage extends Message {
  replace: boolean;
}
