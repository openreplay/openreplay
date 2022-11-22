import ListWalker from '../_common/ListWalker';
import ListWalkerWithMarks from '../_common/ListWalkerWithMarks';

import type { Message } from './messages'

const SIMPLE_LIST_NAMES = [ "event", "redux", "mobx", "vuex", "zustand", "ngrx", "graphql", "exceptions", "profiles"] as const;
const MARKED_LIST_NAMES = [ "log", "resource", "fetch", "stack" ] as const;
//const entityNamesSimple = [ "event", "profile" ];

const LIST_NAMES = [...SIMPLE_LIST_NAMES, ...MARKED_LIST_NAMES ];

// TODO: provide correct types; maybe use list object itself inside the store

export const INITIAL_STATE = LIST_NAMES.reduce((state, name) => {
  state[`${name}List`] = []
  state[`${name}ListNow`] = []
  if (MARKED_LIST_NAMES.includes(name)) {
    state[`${name}MarkedCountNow`] = 0
  }
  return state
}, {})


type SimpleListsObject = {
  [key in typeof SIMPLE_LIST_NAMES[number]]: ListWalker<any>
}
type MarkedListsObject = {
  [key in typeof MARKED_LIST_NAMES[number]]: ListWalkerWithMarks<any>
}
type ListsObject = SimpleListsObject & MarkedListsObject

export type InitialLists = { 
  [key in typeof LIST_NAMES[number]]: any[] 
}

export default class Lists {
  lists: ListsObject
  constructor(initialLists: Partial<InitialLists> = {}) {
    const lists: Partial<ListsObject> = {}
    for (const name of SIMPLE_LIST_NAMES) {
      lists[name] = new ListWalker(initialLists[name])
    }
    for (const name of MARKED_LIST_NAMES) {
      // TODO: provide types
      lists[name] = new ListWalkerWithMarks((el) => el.isRed(), initialLists[name]) 
    }
    this.lists = lists as ListsObject
  }

  getFullListsState() {
    return LIST_NAMES.reduce((state, name) => {
      state[`${name}List`] = this.lists[name].list
      return state
    }, {})
  }

  moveGetState(t: number) {
    return LIST_NAMES.reduce((state, name) => {
      const lastMsg = this.lists[name].moveGetLast(t) // index: name === 'exceptions' ? undefined : index);
      if (lastMsg != null) {
        state[`${name}ListNow`] = this.lists[name].listNow
      }
      return state
    }, MARKED_LIST_NAMES.reduce((state, name) => {
        state[`${name}RedCountNow`] = this.lists[name].markCountNow // Red --> Marked
        return state
      }, {})
    );
  }

}