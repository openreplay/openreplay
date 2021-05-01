import { Map } from 'immutable';

const initialState = Map({
  storage: Map(),
});

export default function storageDuck(name, fromJS = t => t, actions = []) {
  const idKey = `${name}Id`;

  const reducer = (state = initialState, action) => {
    if (actions.includes(action.type)) {
      const { data } = action;
      const updatingList = List(Array.isArray(data) ? data : [ data ]).map(fromJS);


      return state
        .update('storage', storage => updatingList
          .reduce((storage, item) => storage // mergeDeep???
            .mergeIn([ item [ idKey ] ], item), storage))
    }
    return state;
  }

  return { reducer, initialState };
}