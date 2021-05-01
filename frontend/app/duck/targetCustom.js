import { Map } from 'immutable';
import TargetCustom from 'Types/targetCustom';
import crudDuckGenerator from 'Duck/tools/crudDuck';
import { reduceDucks } from 'Duck/tools';


const crudDuck = crudDuckGenerator('customTarget', TargetCustom, { endpoints: {
  fetchList: '/targets_temp',
  save: '/targets_temp',
  remove: '/targets_temp',
}});
export const { fetchList, init, edit, save, remove } = crudDuck.actions;
export default crudDuck.reducer;
