import type { Message } from './messages'
import ListWalker from './managers/ListWalker';

export const LIST_NAMES = ["redux", "mobx", "vuex", "zustand", "ngrx", "graphql", "exceptions", "profiles"] as const;

export const INITIAL_STATE = {}
LIST_NAMES.forEach(name => {
  INITIAL_STATE[`${name}ListNow`] = []
  INITIAL_STATE[`${name}List`] = []
})


type ListsObject = {
  [key in typeof LIST_NAMES[number]]: ListWalker<any>
}

export function initLists(): ListsObject {
  const lists: Partial<ListsObject> = {};
  for (var i = 0; i < LIST_NAMES.length; i++) {
    lists[LIST_NAMES[i]] = new ListWalker();
  }
  return lists as ListsObject;
}
