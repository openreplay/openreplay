import type App from './index.js'

interface SessionInfo {
  sessionID: string | undefined
  metadata: Record<string, string>
  userID: string | null
  timestamp: number
  projectID?: string
}
type OnUpdateCallback = (i: Partial<SessionInfo>) => void

export type Options = {
  session_token_key: string
  session_pageno_key: string
}

export default class Session {
  private metadata: Record<string, string> = {}
  private userID: string | null = null
  private sessionID: string | undefined
  private readonly callbacks: OnUpdateCallback[] = []
  private timestamp = 0
  private projectID: string | undefined

  constructor(private readonly app: App, private readonly options: Options) {}

  attachUpdateCallback(cb: OnUpdateCallback) {
    this.callbacks.push(cb)
  }
  private handleUpdate(newInfo: Partial<SessionInfo>) {
    if (newInfo.userID == null) {
      delete newInfo.userID
    }
    if (newInfo.sessionID == null) {
      delete newInfo.sessionID
    }
    this.callbacks.forEach((cb) => cb(newInfo))
  }

  update(newInfo: Partial<SessionInfo>): void {
    if (newInfo.userID !== undefined) {
      // TODO clear nullable/undefinable types
      this.userID = newInfo.userID
    }
    if (newInfo.metadata !== undefined) {
      Object.entries(newInfo.metadata).forEach(([k, v]) => (this.metadata[k] = v))
    }
    if (newInfo.sessionID !== undefined) {
      this.sessionID = newInfo.sessionID
    }
    if (newInfo.timestamp !== undefined) {
      this.timestamp = newInfo.timestamp
    }
    if (newInfo.projectID !== undefined) {
      this.projectID = newInfo.projectID
    }
    this.handleUpdate(newInfo)
  }

  setMetadata(key: string, value: string) {
    this.metadata[key] = value
    this.handleUpdate({ metadata: { [key]: value } })
  }
  setUserID(userID: string) {
    this.userID = userID
    this.handleUpdate({ userID })
  }

  private getPageNumber(): number | undefined {
    const pageNoStr = this.app.sessionStorage.getItem(this.options.session_pageno_key)
    if (pageNoStr == null) {
      return undefined
    }
    return parseInt(pageNoStr)
  }

  incPageNo(): number {
    let pageNo = this.getPageNumber()
    if (pageNo === undefined) {
      pageNo = 0
    } else {
      pageNo++
    }
    this.app.sessionStorage.setItem(this.options.session_pageno_key, pageNo.toString())
    return pageNo
  }

  getSessionToken(): string | undefined {
    return this.app.sessionStorage.getItem(this.options.session_token_key) || undefined
  }
  setSessionToken(token: string): void {
    this.app.sessionStorage.setItem(this.options.session_token_key, token)
  }

  applySessionHash(hash: string) {
    const hashParts = decodeURI(hash).split('&')
    let token = hash
    let pageNoStr = '100500' // back-compat for sessionToken
    if (hashParts.length == 2) {
      ;[pageNoStr, token] = hashParts
    }
    if (!pageNoStr || !token) {
      return
    }
    this.app.sessionStorage.setItem(this.options.session_token_key, token)
    this.app.sessionStorage.setItem(this.options.session_pageno_key, pageNoStr)
  }

  getSessionHash(): string | undefined {
    const pageNo = this.getPageNumber()
    const token = this.getSessionToken()
    if (pageNo === undefined || token === undefined) {
      return
    }
    return encodeURI(String(pageNo) + '&' + token)
  }

  getInfo(): SessionInfo {
    return {
      sessionID: this.sessionID,
      metadata: this.metadata,
      userID: this.userID,
      timestamp: this.timestamp,
      projectID: this.projectID,
    }
  }

  reset(): void {
    this.app.sessionStorage.removeItem(this.options.session_token_key)
    this.metadata = {}
    this.userID = null
    this.sessionID = undefined
    this.timestamp = 0
  }
}
