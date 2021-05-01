import Schedule from 'Types/schedule';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('scheduler', Schedule);
export const { fetchList, fetch, init, edit, remove } = crudDuck.actions;

export function save(instance) {  // TODO: fix the crudDuckGenerator
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => client.post(`/schedulers${!!instance.schedulerId ? '/' + instance.schedulerId : '' }`, instance),
  };
}

export default crudDuck.reducer;
