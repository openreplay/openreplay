import Environment from 'Types/environment';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('environment', Environment);
export const { fetchList, fetch, init, edit, save, remove } = crudDuck.actions;

export default crudDuck.reducer;
