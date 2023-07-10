import { List, Map } from 'immutable';
import Role from 'Types/role';
import crudDuckGenerator from './tools/crudDuck';
import { reduceDucks } from 'Duck/tools';
import { createListUpdater } from './funcTools/tools';

const crudDuck = crudDuckGenerator('client/role', Role, { idKey: 'roleId' });
export const { fetchList, init, edit, remove } = crudDuck.actions;

const RESET_ERRORS = 'roles/RESET_ERRORS';

const initialState = Map({
  list: List(),
  permissions: List([
    { text: 'Session Replay', value: 'SESSION_REPLAY' },
    { text: 'Developer Tools', value: 'DEV_TOOLS' },
    // { text: 'Errors', value: 'ERRORS' },
    { text: 'Dashboard', value: 'METRICS' },
    { text: 'Assist (Live)', value: 'ASSIST_LIVE' },
    { text: 'Assist (Call)', value: 'ASSIST_CALL' },
    { text: 'Feature Flags', value: 'FEATURE_FLAGS' }
  ]),
});

// const name = "role";
const idKey = 'roleId';

const updateItemInList = createListUpdater(idKey);
const updateInstance = (state, instance) =>
  state.getIn(['instance', idKey]) === instance[idKey]
    ? state.mergeIn(['instance'], instance)
    : state;

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case RESET_ERRORS:
      return state.setIn(['removeRequest', 'errors'], null);
    case crudDuck.actionTypes.SAVE.SUCCESS:
      return updateItemInList(updateInstance(state, action.data), Role(action.data));
  }
  return state;
};

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: (client) =>
      instance.roleId
        ? client.post(`/client/roles/${instance.roleId}`, instance.toData())
        : client.put(`/client/roles`, instance.toData()),
  };
}

export function resetErrors() {
  return {
    type: RESET_ERRORS,
  };
}

export default reduceDucks(crudDuck, { initialState, reducer }).reducer;
