import { Store } from './types'


export default class StoreSubscriber<G, S=G> implements Store<G, S> {
  constructor(private store: Store<G, S>) {}
  get() { return this.store.get() }
  update(newState: Partial<S>) {
    this.store.update(newState)
    this.subscriptions.forEach(sb => sb())
  }
  private subscriptions: Function[] = []
  subscribe<T>(selector: (g: G) => T, cb: (val: T) => void) {
    let prevVal = selector(this.get())
    const checkSubscription = () => {
      const newVal = selector(this.get())
      if (newVal !== prevVal) {
        prevVal = newVal
        cb(newVal)
      }
    }
    this.subscriptions.push(checkSubscription)
  }
}