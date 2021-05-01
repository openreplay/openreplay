import Run from 'Types/run';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('run', Run);
export const { fetchList, fetch, init, edit, save, remove } = crudDuck.actions;

export default crudDuck.reducer;
