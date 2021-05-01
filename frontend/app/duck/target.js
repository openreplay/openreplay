import { Map } from 'immutable';
import Target from 'Types/target';
import { RequestTypes } from 'Duck/requestStateCreator';
import crudDuckGenerator from 'Duck/tools/crudDuck';
import { reduceDucks } from 'Duck/tools';

const FETCH_DEFINED = new RequestTypes('targets/FETCH_DEFINED');

const initialState = Map({
  definedPercent: 0,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case FETCH_DEFINED.SUCCESS:
      return state.set(
        'definedPercent',
        Math.round((action.data.labeled / action.data.total) * 100),
      );
  }
  return state;
};

const crudDuck = crudDuckGenerator('target', Target);
export const { fetchList, init, edit, save, remove } = crudDuck.actions;
export default reduceDucks(crudDuck, { initialState, reducer }).reducer;

export function fetchDefinedTargetsCount() {
  return {
    types: FETCH_DEFINED.toArray(),
    call: client => client.get('/targets/count'),
  };
}
