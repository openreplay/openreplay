import ListWalker from '../common/ListWalker';
import ListWalkerWithMarks from '../common/ListWalkerWithMarks';
import type { Timed } from '../common/types';

const SIMPLE_LIST_NAMES = [
  'event',
  'exceptions',
  'profiles',
  'frustrations',
  'performance',
  'graphql',
] as const;
const MARKED_LIST_NAMES = [
  'log',
  'resource',
  'fetch',
  'stack',
  'websocket',
] as const;

const LIST_NAMES = [...SIMPLE_LIST_NAMES, ...MARKED_LIST_NAMES] as const;

type KeysList = `${(typeof LIST_NAMES)[number]}List`;
type KeysListNow = `${(typeof LIST_NAMES)[number]}ListNow`;
type KeysMarkedCountNow = `${(typeof MARKED_LIST_NAMES)[number]}MarkedCountNow`;
type StateList = {
  [key in KeysList]: Timed[];
};
type StateListNow = {
  [key in KeysListNow]: Timed[];
};
type StateMarkedCountNow = {
  [key in KeysMarkedCountNow]: number;
};
type StateNow = StateListNow & StateMarkedCountNow;
export type State = StateList & StateNow;

// maybe use list object itself inside the store

export const INITIAL_STATE = LIST_NAMES.reduce(
  (state, name) => {
    state[`${name}List`] = [];
    state[`${name}ListNow`] = [];
    return state;
  },
  MARKED_LIST_NAMES.reduce((state, name) => {
    state[`${name}MarkedCountNow`] = 0;
    return state;
  }, {} as Partial<StateMarkedCountNow>) as Partial<State>,
) as State;

type SimpleListsObject = {
  [key in (typeof SIMPLE_LIST_NAMES)[number]]: ListWalker<Timed>;
};
type MarkedListsObject = {
  [key in (typeof MARKED_LIST_NAMES)[number]]: ListWalkerWithMarks<Timed>;
};
type ListsObject = SimpleListsObject & MarkedListsObject;

export type InitialLists = {
  [key in (typeof LIST_NAMES)[number]]: any[]; // .isRed()?
};

export default class Lists {
  lists: ListsObject;

  constructor(initialLists: Partial<InitialLists> = {}) {
    const lists: Partial<ListsObject> = {};
    for (const name of SIMPLE_LIST_NAMES) {
      // own copy: walkers mutate their list, and every tab gets the same session arrays
      lists[name] = new ListWalker(initialLists[name]?.slice());
    }
    for (const name of MARKED_LIST_NAMES) {
      // TODO: provide types
      lists[name] = new ListWalkerWithMarks(
        (el) => el.isRed,
        initialLists[name]?.slice(),
      );
    }
    this.lists = lists as ListsObject;
  }

  getFullListsState(): StateList {
    return LIST_NAMES.reduce((state, name) => {
      state[`${name}List`] = this.lists[name].list;
      return state;
    }, {} as Partial<StateList>) as StateList;
  }

  private publishedMarkedCounts: Partial<StateMarkedCountNow> = {};

  /** countNow of each list when its "now" slice was last published */
  private publishedCounts: Partial<
    Record<(typeof LIST_NAMES)[number], number>
  > = {};

  /** Moves every list to `t`; returns only the "now" values that changed. */
  moveGetState(t: number): Partial<StateNow> {
    const state: Partial<State> = {};
    LIST_NAMES.forEach((name) => {
      const list = this.lists[name];
      list.moveGetLast(t);
      // vs the last published count: a late insert behind the pointer
      // changes the slice without any move
      if (list.countNow !== this.publishedCounts[name]) {
        this.publishedCounts[name] = list.countNow;
        state[`${name}ListNow`] = list.listNow;
      }
    });
    // read after walking, otherwise the counts lag one move behind
    MARKED_LIST_NAMES.forEach((name) => {
      const key = `${name}MarkedCountNow` as const;
      const count = this.lists[name].markedCountNow;
      if (this.publishedMarkedCounts[key] !== count) {
        this.publishedMarkedCounts[key] = count;
        state[key] = count;
      }
    });
    return state;
  }

  /** Current "now" state of every list, without moving. */
  getNowState(): StateNow {
    const state: Partial<State> = {};
    LIST_NAMES.forEach((name) => {
      state[`${name}ListNow`] = this.lists[name].listNow;
      this.publishedCounts[name] = this.lists[name].countNow;
    });
    MARKED_LIST_NAMES.forEach((name) => {
      const key = `${name}MarkedCountNow` as const;
      state[key] = this.publishedMarkedCounts[key] =
        this.lists[name].markedCountNow;
    });
    return state as StateNow;
  }
}
