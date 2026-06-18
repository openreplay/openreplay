import { Store } from './types';

export default class SimpleStore<
  G extends Record<string, any>,
  S extends Record<string, any> = G,
> implements Store<G, S>
{
  constructor(private state: G) {}

  get(): G {
    return this.state;
  }

  update = (newState: Partial<S>) => {
    Object.assign(this.state, newState);
  };

  updateTabStates = (id: string, newState: Partial<S>) => {
    try {
      Object.assign(this.state.tabStates[id], newState);
    } catch (e) {
      console.log(
        'Error updating tab state',
        e,
        id,
        newState,
        this.state,
        this,
      );
    }
  };
}
