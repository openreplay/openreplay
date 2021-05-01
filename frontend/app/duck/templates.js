import Template from 'Types/template';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator(
  'template', Template,
  { endpoints: { fetchList: '/templates' } },
);

export const {
  fetchList, fetch, init, edit, save, remove,
} = crudDuck.actions;

export default crudDuck.reducer;
