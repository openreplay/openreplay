import Member from 'Types/member';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('client/member', Member, { idKey: 'id' });
export const {
  fetchList, init, edit, remove,
} = crudDuck.actions;

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => client.put( instance.id ? `/client/members/${ instance.id }` : '/client/members', instance.toData()),
  };
}

export default crudDuck.reducer;
