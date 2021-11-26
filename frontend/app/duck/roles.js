import { List, Map } from 'immutable';
import Role from 'Types/role';
import crudDuckGenerator from './tools/crudDuck';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import { reduceDucks } from 'Duck/tools';

const GENERATE_LINK = new RequestTypes('roles/GENERATE_LINK');

const crudDuck = crudDuckGenerator('client/role', Role, { idKey: 'roleId' });
export const { fetchList, init, edit, remove, } = crudDuck.actions;

const initialState = Map({
  list: List(),
  permissions: List([
    { name: 'Session Replay', value: 'SESSION_REPLAY' },
    { name: 'Develoepr Tools', value: 'DEV_TOOLS' },
    { name: 'Errors', value: 'ERRORS' },
    { name: 'Metrics', value: 'METRICS' },
    { name: 'Assist Live', value: 'ASSIST_LIVE' },
    { name: 'Assist Call', value: 'ASSIST_CALL' },
  ])
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    
  }
  return state;
};

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    // call: client => client.put( instance.roleId ? `/client/roles/${ instance.roleId }` : '/client/roles', instance.toData()),
    call: client => instance.roleId ? client.post(`/client/roles/${ instance.roleId }`, instance.toData()) : client.put(`/client/roles`, instance.toData()),
  };
}

export default reduceDucks(crudDuck, { initialState, reducer }).reducer;
