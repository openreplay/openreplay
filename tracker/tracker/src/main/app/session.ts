import App, { StartOptions } from "./index.js";
import { UserID, UserAnonymousID, Metadata } from "../../messages/index.js";


enum ActivityState {
  NotActive,
  Starting,
  Active,
}

interface SessionInfo {
  sessionID: string | null,
  metadata: Record<string, string>,
  userID: string | null,
}
type OnUpdateCallback = (i: Partial<SessionInfo>) => void


export default class Session {
  private metadata: Record<string, string> = {}
  private userID: string | null = null
  private sessionID: string | null = null
  private activityState: ActivityState = ActivityState.NotActive
  private callbacks: OnUpdateCallback[] = []

  constructor(private app: App) {}


  attachUpdateCallback(cb: OnUpdateCallback) {
    this.callbacks.push(cb)
  }
  private handleUpdate() {
    const sessInfo: Partial<SessionInfo> = this.getInfo()
    if (sessInfo.userID == null) {
      delete sessInfo.userID
    }
    if (sessInfo.sessionID == null) {
      delete sessInfo.sessionID
    }
    this.callbacks.forEach(cb => cb(sessInfo))
  }

  update({ userID, metadata, sessionID }: Partial<SessionInfo>) {
    if (userID != null) { // TODO clear nullable/undefinable types
      this._setUserID(userID)
    }
    if (metadata !== undefined) {
      Object.entries(metadata).forEach(kv => this._setMetadata(...kv))
    }
    if (sessionID !== undefined) {
      this.sessionID = sessionID 
    }
    this.handleUpdate()
  }

  private _setMetadata(key: string, value: string) {
    this.app.send(new Metadata(key, value))
    this.metadata[key] = value
  }
  private _setUserID(userID: string) {
    this.app.send(new UserID(userID))
    this.userID = userID
  }



  setMetadata(key: string, value: string) {
    this._setMetadata(key, value)
    this.handleUpdate()
  }
  setUserID(userID: string) {
    this._setUserID(userID)
    this.handleUpdate()
  }

  getInfo(): SessionInfo {
    return {
      sessionID: this.sessionID,
      metadata: this.metadata,
      userID: this.userID,
    }
  }
}