export interface Timed { 
  time: number
}

export interface Indexed {
  index: number
}

export interface Moveable {
  move(time: number): void
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

