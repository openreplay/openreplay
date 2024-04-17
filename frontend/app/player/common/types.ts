import { Message } from "Player/web/messages";

export interface Timed {
  time: number
  /** present in mobile events and in db events */
  timestamp?: number
}

export interface Indexed {
  index: number
}

export interface Moveable {
  move(time: number): void
}

export interface Cleanable {
  clean(): void
}

export interface Interval {
  contains(t: number): boolean
  start: number
  end: number
}

export interface Store<G extends Object, S extends Object = G> {
  get(): G
  update(state: Partial<S>): void
}


export interface SessionFilesInfo {
  startedAt: number
  sessionId: string
  isMobile: boolean
  agentToken?: string
  duration: {
    milliseconds: number
    valueOf: () => number
  }
  durationMs: number
  videoURL: string[]
  domURL: string[]
  devtoolsURL: string[]
  /** deprecated */
  mobsUrl: string[]
  fileKey: string  | null
  events: Record<string, any>[]
  stackEvents: Record<string, any>[]
  frustrations: Record<string, any>[]
  errors: Record<string, any>[]
  agentInfo?: { email: string, name: string }
}

export type PlayerMsg = Message & { tabId: string }