import { UserID, UserAnonymousID, Metadata } from '../../common/messages.js';

interface SessionInfo {
  sessionID: string | null;
  metadata: Record<string, string>;
  userID: string | null;
}
type OnUpdateCallback = (i: Partial<SessionInfo>) => void;

export default class Session {
  private metadata: Record<string, string> = {};
  private userID: string | null = null;
  private sessionID: string | null = null;
  private readonly callbacks: OnUpdateCallback[] = [];

  attachUpdateCallback(cb: OnUpdateCallback) {
    this.callbacks.push(cb);
  }
  private handleUpdate(newInfo: Partial<SessionInfo>) {
    if (newInfo.userID == null) {
      delete newInfo.userID;
    }
    if (newInfo.sessionID == null) {
      delete newInfo.sessionID;
    }
    this.callbacks.forEach((cb) => cb(newInfo));
  }

  update(newInfo: Partial<SessionInfo>) {
    if (newInfo.userID !== undefined) {
      // TODO clear nullable/undefinable types
      this.userID = newInfo.userID;
    }
    if (newInfo.metadata !== undefined) {
      Object.entries(newInfo.metadata).forEach(([k, v]) => (this.metadata[k] = v));
    }
    if (newInfo.sessionID !== undefined) {
      this.sessionID = newInfo.sessionID;
    }
    this.handleUpdate(newInfo);
  }

  setMetadata(key: string, value: string) {
    this.metadata[key] = value;
    this.handleUpdate({ metadata: { [key]: value } });
  }
  setUserID(userID: string) {
    this.userID = userID;
    this.handleUpdate({ userID });
  }

  getInfo(): SessionInfo {
    return {
      sessionID: this.sessionID,
      metadata: this.metadata,
      userID: this.userID,
    };
  }

  reset(): void {
    this.metadata = {};
    this.userID = null;
    this.sessionID = null;
  }
}
