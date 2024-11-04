import ListWalker from '../common/ListWalker';
import ListWalkerWithMarks from '../common/ListWalkerWithMarks';
import type { Timed } from '../common/types';


const SIMPLE_LIST_NAMES = [
  "event",
  "exceptions",
  "profiles",
  "frustrations",
  "performance"
] as const
const MARKED_LIST_NAMES = [ "log", "resource", "fetch", "stack", "websocket" ] as const

const LIST_NAMES = [...SIMPLE_LIST_NAMES, ...MARKED_LIST_NAMES ] as const

type KeysList = `${typeof LIST_NAMES[number]}List`
type KeysListNow = `${typeof LIST_NAMES[number]}ListNow`
type KeysMarkedCountNow = `${typeof MARKED_LIST_NAMES[number]}MarkedCountNow`
type StateList = {
  [key in KeysList]: Timed[]
}
type StateListNow = {
  [key in KeysListNow]: Timed[]
}
type StateMarkedCountNow = {
  [key in KeysMarkedCountNow]: number
}
type StateNow = StateListNow & StateMarkedCountNow
export type State = StateList & StateNow

// maybe use list object itself inside the store

export const INITIAL_STATE = LIST_NAMES.reduce((state, name) => {
    state[`${name}List`] = []
    state[`${name}ListNow`] = []
    return state
  }, MARKED_LIST_NAMES.reduce((state, name) => {
    state[`${name}MarkedCountNow`] = 0
    return state
  }, {} as Partial<StateMarkedCountNow>) as Partial<State>
) as State


type SimpleListsObject = {
  [key in typeof SIMPLE_LIST_NAMES[number]]: ListWalker<Timed>
}
type MarkedListsObject = {
  [key in typeof MARKED_LIST_NAMES[number]]: ListWalkerWithMarks<Timed>
}
type ListsObject = SimpleListsObject & MarkedListsObject

export type InitialLists = {
  [key in typeof LIST_NAMES[number]]: any[] // .isRed()?
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
      lists[name] = new ListWalkerWithMarks((el) => el.isRed, initialLists[name])
    }
    this.lists = lists as ListsObject
  }

  getFullListsState(): StateList {
    return LIST_NAMES.reduce((state, name) => {
      state[`${name}List`] = this.lists[name].list
      return state
    }, {} as Partial<StateList>) as StateList
  }

  moveGetState(t: number): StateNow {
    return LIST_NAMES.reduce((state, name) => {
        const lastMsg = this.lists[name].moveGetLast(t) // index: name === 'exceptions' ? undefined : index);
        if (lastMsg != null) {
          state[`${name}ListNow`] = this.lists[name].listNow
        }
        return state
      }, MARKED_LIST_NAMES.reduce((state, name) => {
        state[`${name}MarkedCountNow`] = this.lists[name].markedCountNow // Red --> Marked
        return state
      }, {} as Partial<StateMarkedCountNow>) as Partial<State>
    ) as State
  }

}