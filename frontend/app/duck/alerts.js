import Alert from 'Types/alert';
import { Map } from 'immutable';
import crudDuckGenerator from './tools/crudDuck';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import { reduceDucks } from 'Duck/tools';

const name = 'alert'
const idKey = 'alertId';
const crudDuck = crudDuckGenerator(name, Alert, { idKey: idKey });
export const { fetchList, init, edit, remove } = crudDuck.actions;
const FETCH_TRIGGER_OPTIONS = new RequestTypes(`${name}/FETCH_TRIGGER_OPTIONS`);
const CHANGE_SEARCH = `${name}/CHANGE_SEARCH`

const initialState = Map({
  definedPercent: 0,
  triggerOptions: [],
  alertsSearch: '',
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    // case GENERATE_LINK.SUCCESS:
    //   return state.update(
    //     'list',
    //     list => list
    //       .map(member => {
    //         if(member.id === action.id) {
    //           return Member({...member.toJS(), invitationLink: action.data.invitationLink })
    //         }
    //         return member
    //       })
    //   );
    case CHANGE_SEARCH:
      return state.set('alertsSearch', action.search);
    case FETCH_TRIGGER_OPTIONS.SUCCESS:
      return state.set('triggerOptions', action.data.map(({ name, value }) => ({ label: name, value })));
  }
  return state;
};

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => client.put( instance[idKey] ? `/alerts/${ instance[idKey] }` : '/alerts', instance.toData()),
  };
}

export function changeSearch(search) {
  return {
    type: CHANGE_SEARCH,
    search,
  };
}

export function fetchTriggerOptions() {
  return {
    types: FETCH_TRIGGER_OPTIONS.toArray(),
    call: client => client.get('/alerts/triggers'),
  };
}

// export default crudDuck.reducer;
export default reduceDucks(crudDuck, { initialState, reducer }).reducer;
