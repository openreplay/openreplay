import { makeAutoObservable } from 'mobx';
import { aiService } from 'App/services';


export default class AiFiltersStore {
  filtersString: string = '';
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  getSearchFilters = async (query: string): Promise<any> => {
    this.isLoading = true;
    try {
      const r = await aiService.getSearchFilters(query);
      console.log(r);

      return r;
    } catch (e) {
      console.log(e);
    } finally {
      this.isLoading = false;
    }
  };
}
