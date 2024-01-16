import { Store } from './types'

export default class SimpleSore<G extends Object, S extends Object = G> implements Store<G, S> {
  constructor(private state: G){}
  get(): G {
    return this.state
  }
  update(newState: Partial<S>) {
    Object.assign(this.state, newState)
  }
}


