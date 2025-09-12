export interface Timed { 
  time: number
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
  duration: number
  domURL: string[]
  devtoolsURL: string[]
  /** deprecated */
  mobsUrl: string[]
  fileKey: string  | null
  events: Record<string, any>[]
  stackEvents: Record<string, any>[]
  frustrations: Record<string, any>[]
  errors: Record<string, any>[]
}