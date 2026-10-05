import { isObservable, makeAutoObservable, observable } from 'mobx';

type PlayerStore = {
  update: (state: any) => void;
  updateTabStates: (id: string, state: any) => void;
};

function shallowArrays(state: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key in state) {
    const value = state[key];
    out[key] =
      Array.isArray(value) && !isObservable(value)
        ? observable.array(value, { deep: false })
        : value;
  }
  return out;
}

/**
 * Observable player store whose arrays (message lists, their "now" slices) are shallow:
 * the messages are immutable, and deep observability would rebuild every message as an
 * observable object on each update — during playback that is most of the CPU time.
 */
export function wrapPlayerStore<S extends PlayerStore>(store: S): S {
  const { update, updateTabStates } = store;
  store.update = (state: Record<string, any>) => {
    const next = shallowArrays(state);
    if (state.tabStates) {
      const tabStates: Record<string, any> = {};
      for (const id in state.tabStates) {
        const tab = state.tabStates[id];
        tabStates[id] = isObservable(tab) ? tab : shallowArrays(tab);
      }
      next.tabStates = tabStates;
    }
    update(next);
  };
  store.updateTabStates = (id: string, state: Record<string, any>) =>
    updateTabStates(id, shallowArrays(state));
  return makeAutoObservable(store);
}
