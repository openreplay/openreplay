
import { State } from './types'

// (not a type)
export default class SimpleSore<G, S=G> implements State<G, S> {
  constructor(private state: G){}
  get(): G {
    return this.state
  }
  update(newState: Partial<S>) {
    Object.assign(this.state, newState)
  }
}


