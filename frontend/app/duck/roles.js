import { List, Map } from 'immutable';
import Role from 'Types/role';
import crudDuckGenerator from './tools/crudDuck';
import { reduceDucks } from 'Duck/tools';

const crudDuck = crudDuckGenerator('client/role', Role, { idKey: 'roleId' });
export const { fetchList, init, edit, remove, } = crudDuck.actions;

const RESET_ERRORS = 'roles/RESET_ERRORS';

const initialState = Map({
  list: List(),
  permissions: List([
    { name: 'Session Replay', value: 'SESSION_REPLAY' },
    { name: 'Developer Tools', value: 'DEV_TOOLS' },
    { name: 'Errors', value: 'ERRORS' },
    { name: 'Metrics', value: 'METRICS' },
    { name: 'Assist (Live)', value: 'ASSIST_LIVE' },
    { name: 'Assist (Call)', value: 'ASSIST_CALL' },
  ])
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case RESET_ERRORS:
      return state.setIn(['removeRequest', 'errors'], null);
  }
  return state;
};

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => instance.roleId ? client.post(`/client/roles/${ instance.roleId }`, instance.toData()) : client.put(`/client/roles`, instance.toData()),
  };
}

export function resetErrors() {
  return {
    type: RESET_ERRORS,
  }
}

export default reduceDucks(crudDuck, { initialState, reducer }).reducer;
