import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import {
  filtersMap,
  generateFilterOptions,
  liveFiltersMap,
} from 'Types/filter/newFilter';
import { List } from 'immutable';
import { makeAutoObservable } from 'mobx';
import Search from 'App/mstore/types/search';
import { checkFilterValue, IFilter } from 'App/mstore/types/filter';
import FilterItem from 'App/mstore/types/filterItem';
import { sessionStore } from 'App/mstore';
import { searchService } from 'App/services';

const PER_PAGE = 10;

export const checkValues = (key: any, value: any) => {
  if (key === FilterKey.DURATION) {
    return value[0] === '' || value[0] === null ? [0, value[1]] : value;
  }
  return value.filter((i: any) => i !== '' && i !== null);
};

export const filterMap = ({
                            category,
                            value,
                            key,
                            operator,
                            sourceOperator,
                            source,
                            custom,
                            isEvent,
                            filters,
                            sort,
                            order
                          }: any) => ({
  value: checkValues(key, value),
  custom,
  type: category === FilterCategory.METADATA ? FilterKey.METADATA : key,
  operator,
  source: category === FilterCategory.METADATA ? key.replace(/^_/, '') : source,
  sourceOperator,
  isEvent,
  filters: filters ? filters.map(filterMap) : []
});

class SearchStoreLive {
  list = List();
  latestRequestTime: number | null = null;
  latestList = List();
  alertMetricId: number | null = null;
  instance = new Search();
  instanceLive = new Search();
  savedSearch = new Search();
  filterSearchList: any = {};
  currentPage = 1;
  pageSize = PER_PAGE;
  activeTab = { name: 'All', type: 'all' };
  scrollY = 0;
  sessions = List();
  total: number = 0;
  loadingFilterSearch = false;

  constructor() {
    makeAutoObservable(this);
  }

  get filterList() {
    return generateFilterOptions(filtersMap);
  }
  get filterListLive() {
    return generateFilterOptions(liveFiltersMap);
  }

  fetchFilterSearch(params: any) {
    this.loadingFilterSearch = true;
    searchService.fetchFilterSearch(params).then((response: any) => {
      this.filterSearchList = response.reduce((acc: any, item: any) => {
        const { projectId, type, value } = item;
        const key = type;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ projectId, value });
        return acc;
      }, {}).finally(() => {
        this.loadingFilterSearch = false;
      });
    });
  }

  edit(instance: Partial<Search>) {
    this.instance = new Search(Object.assign({ ...this.instance }, instance));
    this.currentPage = 1;
  }


  apply(filter: any, fromUrl: boolean) {
    if (fromUrl) {
      this.instance = new Search(filter);
      this.currentPage = 1;
    } else {
      this.instance = { ...this.instance, ...filter };
    }
  }

  applyFilter(filter: any, force = false) {
    this.apply(filter, false);
  }

  updateCurrentPage(page: number) {
    this.currentPage = page;
    this.fetchSessions();
  }

  clearSearch() {
    const instance = this.instance;
    this.edit(new Search({
      rangeValue: instance.rangeValue,
      startDate: instance.startDate,
      endDate: instance.endDate,
      filters: []
    }));
  }

  addFilter(filter: any) {
    const index = this.instance.filters.findIndex((i: FilterItem) => i.key === filter.key);

    filter.value = checkFilterValue(filter.value);
    filter.filters = filter.filters
      ? filter.filters.map((subFilter: any) => ({
        ...subFilter,
        value: checkFilterValue(subFilter.value)
      }))
      : null;

    if (index > -1) {
      const oldFilter = this.instance.filters[index];
      const updatedFilter = {
        ...oldFilter,
        value: oldFilter.value.concat(filter.value)
      };
      oldFilter.merge(updatedFilter);
    } else {
      this.instance.filters.push(filter);
      this.instance = new Search({
        ...this.instance.toData()
      });
    }

    if (filter.value && filter.value[0] && filter.value[0] !== '') {
      this.fetchSessions();
    }
  }

  addFilterByKeyAndValue(key: any, value: any, operator?: string, sourceOperator?: string, source?: string) {
    let defaultFilter = { ...filtersMap[key] };
    defaultFilter.value = value;

    if (operator) {
      defaultFilter.operator = operator;
    }
    if (defaultFilter.hasSource && source && sourceOperator) {
      defaultFilter.sourceOperator = sourceOperator;
      defaultFilter.source = source;
    }

    this.addFilter(defaultFilter);
  }

  updateFilter = (index: number, search: Partial<IFilter>) => {
    const newFilters = this.instance.filters.map((_filter: any, i: any) => {
      if (i === index) {
        return search;
      } else {
        return _filter;
      }
    });

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters
    });
  };

  removeFilter = (index: number) => {
    const newFilters = this.instance.filters.filter((_filter: any, i: any) => {
      return i !== index;
    });

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters
    });
  };

  async fetchSessions() {
    await sessionStore.fetchLiveSessions(this.instance.toSearch());
  };
}

export default SearchStoreLive;
