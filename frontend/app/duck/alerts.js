import Alert from 'Types/alert';
import crudDuckGenerator from './tools/crudDuck';

const idKey = 'alertId';
const crudDuck = crudDuckGenerator('alert', Alert, { idKey: idKey });
export const { fetchList, init, edit, remove } = crudDuck.actions;

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => client.put( instance[idKey] ? `/alerts/${ instance[idKey] }` : '/alerts', instance.toData()),
  };
}

export default crudDuck.reducer;
