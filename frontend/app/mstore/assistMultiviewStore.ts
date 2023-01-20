import { makeAutoObservable } from 'mobx';
import { sessionService } from 'App/services';
import Filter from 'Types/filter';
import Session from 'Types/session';
import { List } from 'immutable';

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
  onChangeCb: (sessions: MultiSessions) => void;

  constructor() {
    makeAutoObservable(this);
  }

  isActive(sessionId: string): boolean {
    return this.activeSessionId === sessionId;
  }

  setOnChange(cb: (sessions: MultiSessions) => void) {
    this.onChangeCb = cb;
  }

  get sortedSessions() {
    // @ts-ignore ???
    return this.sessions.slice().sort((a, b) => a.key - b.key);
  }

  get activeSessionId() {
    return this.activeSession?.sessionId || '';
  }

  addSession(session: Record<string, any>) {
    if (
      this.sessions.length < 4 &&
      this.sessions.findIndex((s) => s.sessionId === session.sessionId) === -1
    ) {
      const plainSession = session.toJS ? session.toJS() : session;
      this.sessions.push({ ...plainSession, key: this.sessions.length });
      return this.onChangeCb(this.sessions);
    }
  }

  replaceSession(targetId: string, session: Record<string, any>) {
    const targetIndex = this.sessions.findIndex((s) => s.sessionId === targetId);
    if (targetIndex !== -1) {
      const plainSession = session.toJS ? session.toJS() : session;
      this.sessions[targetIndex] = { ...plainSession, key: targetIndex };
      return this.onChangeCb(this.sessions);
    }
  }

  removeSession(sessionId: string) {
    this.sessions = this.sessions.filter(
      (session) => session.sessionId !== sessionId
    ) as MultiSessions;
    return this.onChangeCb(this.sessions);
  }

  setActiveSession(sessionId: string) {
    this.activeSession = this.sessions.find((session) => session.sessionId === sessionId);
  }

  setDefault(session: Record<string, any>) {
    if (this.sessions.length === 0) {
      const plainSession = session.toJS ? session.toJS() : session;
      const firstItem = { ...plainSession, key: 0 };
      this.sessions = [firstItem];
      this.activeSession = firstItem;

      return this.onChangeCb?.(this.sessions);
    }
  }

  async fetchAgentTokenInfo(sessionId: string) {
    const info = await sessionService.getSessionInfo(sessionId, true);
    return this.setToken(sessionId, info.agentToken);
  }

  async presetSessions(ids: string[]) {
    // @ts-ignore
    const filter = new Filter({ filters: [], sort: '' }).toData();
    const data = await sessionService.getLiveSessions(filter);

    const matchingSessions = data.sessions.filter(
      (s: Record<string, any>) => ids.includes(s.sessionID) || ids.includes(s.sessionId)
    );
    const immutMatchingSessions = List(matchingSessions).map(s => new Session(s));
    immutMatchingSessions.forEach((session: Record<string, any>) => {
      this.addSession(session);
      this.fetchAgentTokenInfo(session.sessionId);
    });

    return data;
  }

  setToken(sessionId: string, token: string) {
    const sessions = this.sessions;
    const targetIndex = sessions.findIndex((s) => s.sessionId === sessionId);
    sessions[targetIndex].agentToken = token;

    return (this.sessions = sessions);
  }

  reset() {
    this.sessions = [];
    this.activeSession = null;
    this.onChangeCb = undefined
  }
}
