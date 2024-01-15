import { InjectedEvent } from 'Types/session/event';
import Issue from 'Types/session/issue';
import ListWalker from '../common/ListWalker';
import ListWalkerWithMarks from '../common/ListWalkerWithMarks';
import type { IResourceRequest, IResourceTiming, Timed } from 'Player';
import {
  Redux as reduxMsg,
  Vuex as vuexMsg,
  MobX as mobxMsg,
  Zustand as zustandMsg,
  NgRx as ngrxMsg,
  GraphQl as graphqlMsg,
  ConsoleLog as logMsg,
  WsChannel as websocketMsg,
  Profiler as profilerMsg,
} from 'Player/web/messages';

type stackMsg = {
  name: string;
  Payload: string;
  tp: number;
} & Timed;
type exceptionsMsg = {
  tp: number;
  name: string;
  message: string;
  payload: string;
  metadata: string;
} & Timed;

type MsgTypeMap = {
  reduxList: reduxMsg;
  mobxList: mobxMsg;
  vuexList: vuexMsg;
  zustandList: zustandMsg;
  ngrxList: ngrxMsg;
  graphqlList: graphqlMsg;
  logList: logMsg;
  fetchList: IResourceRequest;
  resourceList: IResourceTiming;
  stackList: stackMsg;
  websocketList: websocketMsg;
  profilerList: profilerMsg;
  exceptionsList: exceptionsMsg;
  frustrationsList: Issue | InjectedEvent;
};
type ListMessageType<K> = K extends keyof MsgTypeMap ? Array<MsgTypeMap[K]> : Array<Timed>;

const SIMPLE_LIST_NAMES = [
  'event',
  'redux',
  'mobx',
  'vuex',
  'zustand',
  'ngrx',
  'graphql',
  'exceptions',
  'profiles',
  'frustrations',
] as const;
const MARKED_LIST_NAMES = ['log', 'resource', 'fetch', 'stack', 'websocket'] as const;

const LIST_NAMES = [...SIMPLE_LIST_NAMES, ...MARKED_LIST_NAMES] as const;

type KeysList = `${(typeof LIST_NAMES)[number]}List`;
type KeysMarkedCountNow = `${(typeof MARKED_LIST_NAMES)[number]}MarkedCountNow`;
type StateList = {
  [K in KeysList]: ListMessageType<K>;
};
type StateListNow = {
  [K in KeysList as `${K}Now`]: ListMessageType<K>;
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
  }, {} as Partial<StateMarkedCountNow>) as Partial<State>
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
      lists[name] = new ListWalker(initialLists[name]);
    }
    for (const name of MARKED_LIST_NAMES) {
      // TODO: provide types
      lists[name] = new ListWalkerWithMarks((el) => el.isRed, initialLists[name]);
    }
    this.lists = lists as ListsObject;
  }

  getFullListsState(): StateList {
    return LIST_NAMES.reduce((state, name) => {
      state[`${name}List`] = this.lists[name].list;
      return state;
    }, {} as Partial<StateList>) as StateList;
  }

  moveGetState(t: number): StateNow {
    return LIST_NAMES.reduce(
      (state, name) => {
        const lastMsg = this.lists[name].moveGetLast(t); // index: name === 'exceptions' ? undefined : index);
        if (lastMsg != null) {
          state[`${name}ListNow`] = this.lists[name].listNow;
        }
        return state;
      },
      MARKED_LIST_NAMES.reduce((state, name) => {
        state[`${name}MarkedCountNow`] = this.lists[name].markedCountNow; // Red --> Marked
        return state;
      }, {} as Partial<StateMarkedCountNow>) as Partial<State>
    ) as State;
  }
}
