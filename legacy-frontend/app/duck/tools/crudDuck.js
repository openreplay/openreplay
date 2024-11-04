import { Map, List } from 'immutable';

import requestDuckGenerator, { RequestTypes } from './requestDuck';

function getActionTypes(name) {
  return {
    FETCH_LIST: new RequestTypes(`${ name }/FETCH_LIST`),
    FETCH: new RequestTypes(`${ name }/FETCH`),
    FETCH_IN_LIST: new RequestTypes(`${ name }/FETCH_IN_LIST`),
    REMOVE: new RequestTypes(`${ name }/REMOVE`),
    SAVE: new RequestTypes(`${ name }/SAVE`),
    INIT: `${ name }/INIT`,
    EDIT: `${ name }/EDIT`,
  };
}

function getListUpdater(idKey) {
  return (state, instance) => state.update('list', (list) => {
    const index = list.findIndex(item => item[ idKey ] === instance[ idKey ]);
    return (index >= 0
      ? list.mergeIn([ index ], instance)
      : list.push(instance)
    );
  });
}

function getInitialState(fromJS) {
  return Map({
    list: List(),
    instance: fromJS(),
  });
}

function getDefaultEndpoints(namePl) {
  return {
    fetch: {
      method: 'GET',
      endpoint: id => `/${ namePl }/${ id }`,
    },
    fetchList: {
      method: 'GET',
      endpoint: `/${ namePl }`,
    },
    save: {
      method: 'PUT',
      endpoint: `/${ namePl }`,
    },
    remove: {
      method: 'DELETE',
      endpoint: id => `/${ namePl }/${ id }`,
    },
  };
}

const defaultReducer = (state = Map()) => state;

export default function generate(
  name,
  fromJS = r => r,
  options = {},
) {
  const {
    endpoints = {},
    customReducer = defaultReducer,
    idKey = `${ name }Id`,
  } = options;
  const namePl = `${ name }s`;

  const defaultEndpoints = getDefaultEndpoints(namePl);

  function getCallFn(key, arg2) {
    let method;
    let endpoint;
    const e = !!endpoints && endpoints[ key ];
    const eType = typeof e;
    if (eType === 'string' || eType === 'function') {
      ({ method } = defaultEndpoints[ key ]);
      endpoint = e;
    } else if (eType === 'object' && e !== null) { // TODO: more general
      ({ method, endpoint } = e);
    } else {
      ({ method, endpoint } = defaultEndpoints[ key ]);
    }

    const methodName = method.toLowerCase();
    const endpointString = typeof endpoint === 'function'
      ? endpoint(arg2)
      : endpoint;
    const params = typeof arg2 === 'object' && arg2;
    return client => client[ methodName ](endpointString, params);
  }
  /* ======================================= */

  /* Action types */
  const actionTypes = getActionTypes(name);
  const {
    FETCH_LIST,
    FETCH,
    FETCH_IN_LIST,
    REMOVE,
    SAVE,
    INIT,
    EDIT,
  } = actionTypes;
  /* ============ */

  const updateList = getListUpdater(idKey);
  const initialState = getInitialState(fromJS);

  const reducer = (argState, action = {}) => {
    let state = customReducer(argState, action);
    // initialization
    state = argState ? state : state.merge(initialState);

    switch (action.type) {
      case FETCH_LIST.SUCCESS:        
        // TODO: use OreredMap by id & merge;
        return state.set('list', List(action.data).map(fromJS));
      case FETCH_IN_LIST.SUCCESS:
        return updateList(state, fromJS(action.data));
      case INIT:
        return state.set('instance', fromJS(action.instance));
      case SAVE.SUCCESS:
        const instance = fromJS(action.data);
        return updateList(state, instance).set('instance', instance);
      case FETCH.SUCCESS: {        
        const instance = fromJS(action.data);
        return updateList(state, instance).set('instance', instance);
      }
      case EDIT:
        return state.mergeIn([ 'instance' ], action.instance);
      case REMOVE.SUCCESS:
        return state
          .update('list', list => list.filter(item => item[ idKey ] !== action.id))
          .updateIn([ 'instance', idKey ], id => (id === action.id ? '' : id));
      default:
        return state;
    }
  };

  const actions = {

    fetch: (id, options = { thenInit: true }) => (dispatch, getState) => {
      const itemInList = getState().getIn([ namePl, 'list' ]).find(item => item[ idKey ] === id);
      if (!itemInList || !itemInList.isComplete()) { // name of func?
        return dispatch({
          types: options.thenInit ? FETCH.toArray() : FETCH_IN_LIST.toArray(),
          call: getCallFn('fetch', id),
        });
      }
      if (options.thenInit) dispatch(actions.init(itemInList));
      return Promise.resolve();
    },

    fetchList(params) {
      return {
        types: FETCH_LIST.toArray(),
        call: getCallFn('fetchList', params),
      };
    },

    init(instance) {
      return {
        type: INIT,
        instance,
      };
    },

    edit(instance) {
      return {
        type: EDIT,
        instance,
      };
    },

    save(instance) {
      return {
        types: SAVE.toArray(),
        call: getCallFn('save', instance.toData()),
        instance,
      };
    },

    remove(id) {
      return {
        types: REMOVE.toArray(),
        call: getCallFn('remove', id),
        id,
      };
    },

  };

  const requestDuck = requestDuckGenerator({
    _: FETCH_LIST,
    inListRequest: FETCH_IN_LIST,
    fetchRequest: FETCH,
    saveRequest: SAVE,
    removeRequest: REMOVE,
  }, reducer);

  return {
    actions,
    reducer: requestDuck.reducer,
    actionTypes,
    initialState: initialState.merge(requestDuck.initialState),
  };
}
