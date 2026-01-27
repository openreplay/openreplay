import { makeAutoObservable, runInAction } from 'mobx';
import { BotChunk, ChatManager } from './SocketManager';
import { kaiService as aiService, kaiService } from 'App/services';
import { toast } from 'react-toastify';
import Widget from 'App/mstore/types/widget';
import Session, { ISession } from '@/types/session/session';

export interface Message {
  text: string;
  isUser: boolean;
  messageId: string;
  /** filters to get chart */
  chart: string;
  /** chart data */
  chart_data: string;
  supports_visualization: boolean;
  feedback: boolean | null;
  duration: number;
  sessions?: Session[];
}
export interface SentMessage
  extends Omit<
    Message,
    'duration' | 'feedback' | 'chart' | 'supports_visualization'
  > {
  replace: boolean;
}

class KaiStore {
  chatManager: ChatManager | null = null;
  processingStage: BotChunk | null = null;
  messages: Array<Message> = [];
  queryText = '';
  chatTitle: string | null = null;
  loadingChat = false;
  replacing: string | null = null;
  usage = {
    total: 0,
    used: 0,
    percent: 0,
  };

  constructor() {
    makeAutoObservable(this);
    this.checkUsage();
  }

  get lastHumanMessage() {
    let msg: any = null;
    let index: null | number = null;
    if (this.messages) {
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const message = this.messages[i];
        if (message.isUser) {
          msg = message;
          index = i;
          break;
        }
      }
    }
    return { msg, index };
  }

  get firstHumanMessage() {
    let msg: any = null;
    let index: null | number = null;
    if (this.messages) {
      for (let i = 0; i < this.messages.length; i++) {
        const message = this.messages[i];
        if (message.isUser) {
          msg = message;
          index = i;
          break;
        }
      }
    }
    return { msg, index };
  }

  get lastKaiMessage() {
    let msg: any = null;
    let index: null | number = null;
    if (this.messages) {
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const message = this.messages[i];
        if (!message.isUser) {
          msg = message;
          index = i;
          break;
        }
      }
    }
    return { msg, index };
  }

  getPreviousMessage = (messageId: string) => {
    const index = this.messages.findIndex((msg) => msg.messageId === messageId);
    if (index > 0) {
      return this.messages[index - 1];
    }
    return null;
  };

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

  editMessage = (text: string, messageId: string) => {
    this.setQueryText(text);
    this.setReplacing(messageId);
  };

  replaceAtIndex = (message: Message, index: number) => {
    const messages = [...this.messages];
    messages[index] = message;
    this.setMessages(messages);
  };

  deleteAtIndex = (indexes: number[]) => {
    if (!indexes || !indexes.length) return;
    const messages = this.messages.filter((_, i) => !indexes.includes(i));
    runInAction(() => {
      this.messages = messages;
    });
  };

  setTitle = (title: string | null) => {
    this.chatTitle = title;
  };

  getChat = async (projectId: string, threadId: string) => {
    this.setLoadingChat(true);
    try {
      const { messages, title } = await aiService.getKaiChat(
        projectId,
        threadId,
      );
      if (messages && messages.length) {
        this.setTitle(title);
        this.setMessages(
          messages.map((m) => {
            const isUser = m.role === 'human';
            return {
              text: m.content,
              isUser: isUser,
              messageId: m.message_id,
              duration: m.duration,
              feedback: m.feedback,
              chart: m.chart,
              supports_visualization: m.supports_visualization,
              chart_data: m.chart_data,
              sessions: m.sessions
                ? m.sessions.map((s) => new Session(s))
                : undefined,
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
    initialMsg: string | null,
  ) => {
    const token = kaiService.client.getJwt();
    if (!token) {
      console.error('No token found');
      return;
    }
    this.checkUsage();
    this.chatManager = new ChatManager({ ...settings, token });
    this.chatManager.setOnMsgHook({
      msgCallback: (msg) => {
        if (msg.type === 'state') {
          if (msg.state === 'running') {
            this.setProcessingStage({
              content: 'Processing your request...',
              stage: 'chart',
              messageId: Date.now().toPrecision(),
              duration: msg.start_time ? Date.now() - msg.start_time : 0,
              type: 'chunk',
              supports_visualization: false,
            });
          } else {
            this.setProcessingStage(null);
          }
        }
        if (msg.type === 'chunk') {
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
              chart: '',
              supports_visualization: msg.supports_visualization,
              chart_data: '',
              sessions: msg.sessions
                ? msg.sessions.map((s) => new Session(s))
                : undefined,
            };
            this.bumpUsage();
            this.addMessage(msgObj);
            this.setProcessingStage(null);
          }
        }
      },
      titleCallback: this.setTitle,
    });

    if (initialMsg) {
      this.sendMessage(initialMsg);
    }
  };

  setReplacing = (replacing: string | null) => {
    this.replacing = replacing;
  };

  bumpUsage = () => {
    this.usage.used += 1;
    this.usage.percent = Math.min(
      (this.usage.used / this.usage.total) * 100,
      100,
    );
    if (this.usage.used >= this.usage.total) {
      toast.error('You have reached the daily limit for queries.');
    }
  };

  sendMessage = (message: string) => {
    if (this.chatManager) {
      this.chatManager.sendMessage(message, !!this.replacing);
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
      this.setReplacing(null);
    }
    this.addMessage({
      text: message,
      isUser: true,
      messageId: Date.now().toString(),
      feedback: null,
      duration: 0,
      supports_visualization: false,
      chart: '',
      chart_data: '',
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

  charts = new Map<string, Record<string, any>>();
  getMessageChart = async (msgId: string, projectId: string) => {
    this.setProcessingStage({
      content: 'Generating visualization...',
      stage: 'chart',
      messageId: msgId,
      duration: 0,
      type: 'chunk',
      supports_visualization: false,
    });
    try {
      const filtersStr = await kaiService.getMsgChart(msgId, projectId);
      if (!filtersStr || !filtersStr.length) {
        throw new Error('No filters found for the message');
      }
      const filters = JSON.parse(filtersStr);
      const data = {
        ...filters,
      };
      const metric = new Widget().fromJson(data);
      this.charts.set(msgId, data);
      return metric;
    } catch (e) {
      console.error(e);
      throw new Error('Failed to generate visualization');
    } finally {
      this.setProcessingStage(null);
    }
  };

  saveLatestChart = async (msgId: string, projectId: string) => {
    const data = this.charts.get(msgId);
    if (data) {
      try {
        await kaiService.saveChartData(msgId, projectId, data);
        this.charts.delete(msgId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  getParsedChart = (data: string) => {
    const parsedData = JSON.parse(data);
    return new Widget().fromJson(parsedData);
  };

  setUsage = (usage: { total: number; used: number; percent: number }) => {
    this.usage = usage;
  };

  checkUsage = async () => {
    try {
      const { total, used } = await kaiService.checkUsage();
      this.setUsage({ total, used, percent: Math.round((used / total) * 100) });
    } catch (e) {
      console.error(e);
    }
  };
}

export const kaiStore = new KaiStore();
