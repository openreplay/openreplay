import Variable from 'Types/variable';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('variable', Variable);
export const {
  fetchList, fetch, init, edit, save, remove,
} = crudDuck.actions;

export default crudDuck.reducer;
