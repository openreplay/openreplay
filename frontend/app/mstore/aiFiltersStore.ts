import { makeAutoObservable } from 'mobx';
import { aiService } from 'App/services';

const mapFilter = {
  '=': 'is',
  '!=': 'isNot',
  'LIKE %': 'startsWith',
  'LIKE': 'startsWith',


}

export default class AiFiltersStore {
  filtersString: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  getSearchFilters = async (query: string): Promise<string> => {
    const r = await aiService.getSearchFilters(query);
    console.log(r)

    return r
  }
}
