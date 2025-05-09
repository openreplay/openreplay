import io from 'socket.io-client';

export class ChatManager {
  socket: ReturnType<typeof io>;
  threadId: string | null = null;

  constructor({ projectId, userId, threadId }: { projectId: string; userId: string; threadId: string }) {
    this.threadId = threadId;
    console.log('Kai socket', projectId, userId, threadId, window.env.KAI_TESTING);
    const socket = io(`localhost:8700/kai/chat`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      multiplex: true,
      query: {
        user_id: userId,
        token: window.env.KAI_TESTING,
        project_id: projectId,
        thread_id: threadId,
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
    })
    socket.onAny((e) => console.log('event', e));

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
    msgCallback: (msg: BotChunk | { state: string, type: 'state', start_time?: number }) => void;
    titleCallback: (title: string) => void;
  }) => {
    this.socket.on('chunk', (msg: BotChunk) => {
      console.log('Received message:', msg);
      msgCallback(msg);
    });
    this.socket.on('title', (msg: { content: string }) => {
      console.log('Received title:', msg);
      titleCallback(msg.content);
    });
    this.socket.on('state', (state: { message: 'idle' | 'running', start_time: number }) => {
      msgCallback({ state: state.message, type: 'state', start_time: state.start_time })
    })
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
}

export interface SentMessage extends Message {
  replace: boolean
}
