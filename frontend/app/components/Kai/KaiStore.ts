import { makeAutoObservable, runInAction } from 'mobx';
import { BotChunk, ChatManager, Message } from './SocketManager';
import { kaiService as aiService, kaiService } from 'App/services';
import { toast } from 'react-toastify';

class KaiStore {
  chatManager: ChatManager | null = null;
  processingStage: BotChunk | null = null;
  messages: Message[] = [];
  queryText = '';
  loadingChat = false;
  replacing = false;

  constructor() {
    makeAutoObservable(this);
  }

  get lastHumanMessage() {
    let msg = null;
    let index = null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (message.isUser) {
        msg = message;
        index = i;
        break;
      }
    }
    return { msg, index };
  }

  get lastKaiMessage() {
    let msg = null;
    let index = null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (!message.isUser) {
        msg = message;
        index = i;
        break;
      }
    }
    return { msg, index };
  }

  setQueryText = (text: string) => {
    this.queryText = text;
  };

  setLoadingChat = (loading: boolean) => {
    this.loadingChat = loading;
  };

  setChatManager = (chatManager: ChatManager) => {
    this.chatManager = chatManager;
  };

  setProcessingStage = (stage: BotChunk | null) => {
    this.processingStage = stage;
  };

  setMessages = (messages: Message[]) => {
    this.messages = messages;
  };

  addMessage = (message: Message) => {
    this.messages.push(message);
  };

  editMessage = (text: string) => {
    this.setQueryText(text);
    this.setReplacing(true);
  };

  replaceAtIndex = (message: Message, index: number) => {
    const messages = [...this.messages];
    messages[index] = message;
    this.setMessages(messages);
  };

  deleteAtIndex = (indexes: number[]) => {
    if (!indexes.length) return;
    const messages = this.messages.filter((_, i) => !indexes.includes(i));
    runInAction(() => {
      this.messages = messages;
    });
  };

  getChat = async (projectId: string, threadId: string) => {
    this.setLoadingChat(true);
    try {
      const res = await aiService.getKaiChat(projectId, threadId);
      if (res && res.length) {
        this.setMessages(
          res.map((m) => {
            const isUser = m.role === 'human';
            return {
              text: m.content,
              isUser: isUser,
              messageId: m.message_id,
              duration: m.duration,
              feedback: m.feedback,
            };
          }),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load chat history. Please try again later.");
    } finally {
      this.setLoadingChat(false);
    }
  };

  createChatManager = (
    settings: { projectId: string; threadId: string },
    setTitle: (title: string) => void,
    initialMsg: string | null,
  ) => {
    const token = kaiService.client.getJwt();
    if (!token) {
      console.error('No token found');
      return;
    }
    this.chatManager = new ChatManager({ ...settings, token });
    this.chatManager.setOnMsgHook({
      msgCallback: (msg) => {
        if ('state' in msg) {
          if (msg.state === 'running') {
            this.setProcessingStage({
              content: 'Processing your request...',
              stage: 'chart',
              messageId: Date.now().toPrecision(),
              duration: msg.start_time ? Date.now() - msg.start_time : 0,
            });
          } else {
            this.setProcessingStage(null);
          }
        } else {
          if (msg.stage === 'start') {
            this.setProcessingStage({
              ...msg,
              content: 'Processing your request...',
            });
          }
          if (msg.stage === 'chart') {
            this.setProcessingStage(msg);
          }
          if (msg.stage === 'final') {
            const msgObj = {
              text: msg.content,
              isUser: false,
              messageId: msg.messageId,
              duration: msg.duration,
              feedback: null,
            };
            this.addMessage(msgObj);
            this.setProcessingStage(null);
          }
        }
      },
      titleCallback: setTitle,
    });

    if (initialMsg) {
      this.sendMessage(initialMsg);
    }
  };

  setReplacing = (replacing: boolean) => {
    this.replacing = replacing;
  };

  sendMessage = (message: string) => {
    if (this.chatManager) {
      this.chatManager.sendMessage(message, this.replacing);
    }
    if (this.replacing) {
      console.log(
        this.lastHumanMessage,
        this.lastKaiMessage,
        'replacing these two',
      );
      const deleting = [];
      if (this.lastHumanMessage.index !== null) {
        deleting.push(this.lastHumanMessage.index);
      }
      if (this.lastKaiMessage.index !== null) {
        deleting.push(this.lastKaiMessage.index);
      }
      this.deleteAtIndex(deleting);
      this.setReplacing(false);
    }
    this.addMessage({
      text: message,
      isUser: true,
      messageId: Date.now().toString(),
      feedback: null,
      duration: 0,
    });
  };

  sendMsgFeedback = (
    feedback: string,
    messageId: string,
    projectId: string,
  ) => {
    this.messages = this.messages.map((msg) => {
      if (msg.messageId === messageId) {
        return {
          ...msg,
          feedback: feedback === 'like' ? true : false,
        };
      }
      return msg;
    });
    aiService
      .feedback(feedback === 'like', messageId, projectId)
      .then(() => {
        toast.success('Feedback saved.');
      })
      .catch((e) => {
        console.error(e);
        toast.error('Failed to send feedback. Please try again later.');
      });
  };

  cancelGeneration = async (settings: {
    projectId: string;
    userId: string;
    threadId: string;
  }) => {
    try {
      await kaiService.cancelGeneration(settings.projectId, settings.threadId);
      this.setProcessingStage(null);
    } catch (e) {
      console.error(e);
      toast.error(
        'Failed to cancel the response generation, please try again later.',
      );
    }
  };

  clearChat = () => {
    this.setMessages([]);
    this.setProcessingStage(null);
    this.setLoadingChat(false);
    this.setQueryText('');
    if (this.chatManager) {
      this.chatManager.disconnect();
      this.chatManager = null;
    }
  };
}

export const kaiStore = new KaiStore();
