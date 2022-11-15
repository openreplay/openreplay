
export interface Mover {
  move(time: number): void
}

export interface Cleaner {
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


