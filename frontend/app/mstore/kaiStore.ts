import { makeAutoObservable } from 'mobx';

type threadId = number | string;

export interface RecentChat {
  title: string;
  thread_id: threadId;
}

export interface ChartData {
  timestamp: number,
  [key: string]: number
}

export interface Message {
  role: 'human' | 'kai';
  content: string;
  chart?: { type: string, data?: ChartData[] }
  message_id: number;
}

export default class KaiStore {
  recentChats: RecentChat[] = [];
  chats: Record<threadId, Message[]> = {};
  activeThreadId: threadId = 0;
  loadingHistory = false;
  loadingAnswer = false;
  status = 'thinking';

  constructor() {
    makeAutoObservable(this);
  }

  setActiveThreadId = (threadId: threadId) => {
    this.activeThreadId = threadId;
  }

  setStatus = (status: string) => {
    this.status = status;
  }

  setLoadingHistory = (loading: boolean) => {
    this.loadingHistory = loading;
  }

  setLoadingAnswer = (loading: boolean) => {
    this.loadingAnswer = loading;
  }

  addRecentChat = (chat: RecentChat) => {
    this.recentChats.push(chat);
  }

  setRecentChats = (chats: RecentChat[]) => {
    this.recentChats = chats;
  }

  addMessage = (threadId: number, message: Message) => {
    const id = `_${threadId}` as threadId;
    if (!this.chats[id]) {
      this.chats[id] = [];
    }
    this.chats[id].push(message);
  }

  setMessages = (threadId: number, messages: Message[]) => {
    const id = `_${threadId}` as threadId;
    this.chats[id] = messages;
  }

  getMessages = (threadId: number) => {
    const id = `_${threadId}` as threadId;
    return this.chats[id] || [];
  }
}