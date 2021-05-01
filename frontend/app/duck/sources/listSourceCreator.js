import { List, Map } from 'immutable';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';

const actionMap = {};

export default (
  name,
  endpoint,
  fromJS = a => a,
  convertFromRoot = false,
  customInitialState = Map({ list: List() }),
) => {
  const initialState = customInitialState || Map({
    list: List(),
  });

  const FETCH_LIST = new RequestTypes(`${ name }/FETCH_LIST`);

  actionMap[ name ] = params => ({
    types: FETCH_LIST.toArray(),
    call: client => client.get(endpoint, params),
  });

  const reducer = (state = initialState, action = {}) => {
    switch (action.type) {
      case FETCH_LIST.SUCCESS:
        return convertFromRoot
          ? state.merge(fromJS(action.data))
          : state.set('list', List(action.data).map(fromJS).toSet().toList()); // ??
    }
    return state;
  };

  return withRequestState(FETCH_LIST, reducer);
};

export function getAction(name, params) {
  return actionMap[ name ](params);
}
