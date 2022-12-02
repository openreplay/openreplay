import { makeAutoObservable } from 'mobx';

type MultiSessions = [
  LiveSessionListItem?,
  LiveSessionListItem?,
  LiveSessionListItem?,
  LiveSessionListItem?
];
export interface LiveSessionListItem extends Record<string, any> {
  key: number | string;
}

export default class AssistMultiviewStore {
  sessions: MultiSessions = [];
  activeSession: LiveSessionListItem = null;

  constructor() {
    makeAutoObservable(this);
  }

  isActive(sessionId: string): boolean {
    console.log(sessionId, this.activeSessionId)
    return this.activeSessionId === sessionId;
  }

  get sortedSessions() {
    // @ts-ignore ???
    return this.sessions.slice().sort((a, b) => a.key - b.key);
  }

  get activeSessionId() {
    return this.activeSession?.sessionId || '';
  }

  addSession(session: Record<string, any>) {
    if (this.sessions.length < 4) {
      this.sessions.push({ ...session.toJS(), key: this.sessions.length });
    }
  }

  replaceSession(targetId: string, session: Record<string, any>) {
    const targetIndex = this.sessions.findIndex(s => s.sessionId === targetId);
    if (targetIndex !== -1) {
      this.sessions[targetIndex] = { ...session.toJS(), key: targetIndex }
    }
  }

  removeSession(sessionId: string) {
    return this.sessions = this.sessions.filter(session => session.sessionId !== sessionId) as MultiSessions;
  }

  setActiveSession(sessionId: string) {
    this.activeSession = this.sessions.find((session) => session.sessionId === sessionId);
  }

  setDefault(session: Record<string, any>) {
    if (this.sessions.length === 0) {
      const firstItem = {...session.toJS?.(), key: 0}
      this.sessions = [firstItem]
      this.activeSession = firstItem
    }
  }

  reset() {
    this.sessions = [];
    this.activeSession = null;
  }
}
