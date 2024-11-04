import { Map } from 'immutable';

export function mergeReducers(...reducers) {
  const initialState = reducers
    .reduce((accumState, reducer) => accumState.merge(reducer()), Map());
	return (state = initialState, action) =>
    reducers.reduce((accumState, reducer) => reducer(accumState, action), state);
}

export function createListUpdater(idKey, listName = 'list') {
  return (state, instance) => state.update(listName, (list) => {
    const index = list.findIndex(item => item[ idKey ] === instance[ idKey ]);
    return (index >= 0
      ? list.mergeIn([ index ], instance)
      : list.push(instance)
    );
  });
}

export function createItemInListUpdater(idKey = 'id', shouldAdd = true) { 
	return instance => 
		list => {
	    const index = list.findIndex(item => item[ idKey ] === instance[ idKey ]);
	    return index >= 0
	      ? list.mergeIn([ index ], instance)
	      : (shouldAdd ? list.push(instance) : list);
	  }
}

export const request = type => `${ type }_REQUEST`;
export const success = type => `${ type }_SUCCESS`;
export const failure = type => `${ type }_FAILURE`;
export const array = type => [ request(type), success(type), failure(type) ];
