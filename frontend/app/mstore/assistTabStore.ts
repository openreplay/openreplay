import { makeAutoObservable } from "mobx"
import Session from './types/session';

type TabSessions = [Session?,Session?,Session?,Session?]

export default class AssistTabStore {
  sessions: TabSessions = []
  activeSession: Session = null

  constructor() {
    makeAutoObservable(this)
  }

  isActive(sessionId: string): boolean {
    return this.activeSession.sessionId === sessionId
  }

  get activeSessionId() {
    return this.activeSession?.sessionId || ''
  }

  setSessions(sessions: TabSessions) {
    this.sessions = sessions
  }

  addSession(session: Session) {
    if (this.sessions.length < 4) {
      this.sessions.push(session)
    }
  }

  setActiveSession(sessionId: string) {
    this.activeSession = this.sessions.find(session => session.sessionId === sessionId)
  }

  reset() {
    this.sessions = []
    this.activeSession = null
  }
}
