import Period, { CUSTOM_RANGE } from 'Types/app/period';
import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import {
  conditionalFiltersMap,
  filtersMap,
  generateFilterOptions,
  liveFiltersMap,
  mobileConditionalFiltersMap
} from 'Types/filter/newFilter';
import { List } from 'immutable';
import { makeAutoObservable, runInAction } from 'mobx';
import { searchService, sessionService } from 'App/services';
import Search from 'App/mstore/types/search';
import { checkFilterValue } from 'App/mstore/types/filter';
import FilterItem from 'App/mstore/types/filterItem';
import { sessionStore, settingsStore } from 'App/mstore';
import SavedSearch, { ISavedSearch } from 'App/mstore/types/savedSearch';
import { iTag } from '@/services/NotesService';
import { issues_types } from 'Types/session/issue';

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

export const TAB_MAP: any = {
  all: { name: 'All', type: 'all' },
  sessions: { name: 'Sessions', type: 'sessions' },
  bookmarks: { name: 'Bookmarks', type: 'bookmarks' },
  notes: { name: 'Notes', type: 'notes' },
  recommendations: { name: 'Recommendations', type: 'recommendations' }
};

class SearchStore {
  list: SavedSearch[] = [];

  latestRequestTime: number | null = null;

  latestList = List();

  alertMetricId: number | null = null;

  instance = new Search();

  savedSearch: ISavedSearch = new SavedSearch();

  filterSearchList: any = {};

  currentPage = 1;

  pageSize = PER_PAGE;

  activeTab = { name: 'All', type: 'all' };

  scrollY = 0;

  sessions = List();

  total: number = 0;
  latestSessionCount: number = 0;
  loadingFilterSearch = false;

  isSaving: boolean = false;

  activeTags: any[] = [];

  urlParsed: boolean = false;
  searchInProgress = false;

  constructor() {
    makeAutoObservable(this);
  }

  setUrlParsed() {
    this.urlParsed = true;
  }

  get filterList() {
    return generateFilterOptions(filtersMap);
  }

  get filterListMobile() {
    return generateFilterOptions(filtersMap, true);
  }

  get filterListLive() {
    return generateFilterOptions(liveFiltersMap);
  }

  get filterListConditional() {
    return generateFilterOptions(conditionalFiltersMap);
  }

  get filterListMobileConditional() {
    return generateFilterOptions(mobileConditionalFiltersMap);
  }

  applySavedSearch(savedSearch: ISavedSearch) {
    this.savedSearch = savedSearch;
    this.edit({
      filters: savedSearch.filter
        ? savedSearch.filter.filters.map((i: FilterItem) =>
          new FilterItem().fromJson(i)
        )
        : []
    });
    this.currentPage = 1;
  }

  async fetchSavedSearchList() {
    const response = await searchService.fetchSavedSearch();
    this.list = response.map((item: any) => new SavedSearch(item));
  }

  edit(instance: Partial<Search>) {
    this.instance = new Search({ ...this.instance, ...instance });
    this.currentPage = 1;
  }

  editSavedSearch(instance: Partial<SavedSearch>) {
    this.savedSearch = new SavedSearch(
      Object.assign(this.savedSearch.toData(), instance),
    );
  }

  apply(filter: any, fromUrl: boolean) {
    if (fromUrl) {
      this.instance = new Search(filter);
    } else {
      this.instance = new Search({ ...this.instance.toData(), ...filter });
    }
    this.currentPage = 1;
  }

  applyFilter(filter: any, force = false) {
    this.apply(filter, false);
  }

  fetchFilterSearch(params: any) {
    this.loadingFilterSearch = true;

    searchService
      .fetchFilterSearch(params)
      .then((response: any[]) => {
        this.filterSearchList = response.reduce(
          (
            acc: Record<string, { projectId: number; value: string }[]>,
            item: any,
          ) => {
            const { projectId, type, value } = item;
            if (!acc[type]) acc[type] = [];
            acc[type].push({ projectId, value });
            return acc;
          },
          {},
        );
      })
      .catch((error: any) => {
        console.error('Error fetching filter search:', error);
      })
      .finally(() => {
        this.loadingFilterSearch = false;
      });
  }

  updateCurrentPage(page: number, force = false) {
    this.currentPage = page;
    void this.fetchSessions(force);
  }

  updateLatestSessionCount(count: number = 0) {
    this.latestSessionCount = count;
  }

  setActiveTab(tab: string) {
    runInAction(() => {
      this.activeTab = TAB_MAP[tab];
    });
  }

  toggleTag(tag?: iTag) {
    if (!tag) {
      this.activeTags = [];
      void this.fetchSessions(true);
    } else {
      this.activeTags = [tag];
      void this.fetchSessions(true);
    }
  }

  async removeSavedSearch(id: string): Promise<void> {
    await searchService.deleteSavedSearch(id);
    this.savedSearch = new SavedSearch({});
    await this.fetchSavedSearchList();
  }

  async save(id?: string | null, rename = false): Promise<void> {
    const filter = this.instance.toData();
    const isNew = !id;
    const instance = this.savedSearch.toData();
    const newInstance = rename ? instance : { ...instance, filter };
    newInstance.filter.filters = newInstance.filter.filters.map(filterMap);

    await searchService.saveSavedSearch(newInstance, id);
    await this.fetchSavedSearchList();

    if (isNew) {
      const lastSavedSearch = this.list[this.list.length - 1];
      this.applySavedSearch(lastSavedSearch);
    }
  }

  clearList() {
    this.list = [];
  }

  clearSearch() {
    const { instance } = this;
    this.edit(
      new Search({
        rangeValue: instance.rangeValue,
        startDate: instance.startDate,
        endDate: instance.endDate,
        filters: []
      })
    );

    this.savedSearch = new SavedSearch({});
    sessionStore.clearList();
    // void this.fetchSessions(true);
  }

  async checkForLatestSessionCount(): Promise<void> {
    try {
      const filter = this.instance.toSearch();

      // Set time filter if we have the latest request time
      if (this.latestRequestTime) {
        const period = Period({
          rangeName: CUSTOM_RANGE,
          start: this.latestRequestTime,
          end: Date.now()
        });
        const timeRange: any = period.toJSON();
        filter.startDate = timeRange.startDate;
        filter.endDate = timeRange.endDate;
      }

      // Only need the total count, not actual records
      filter.limit = 1;
      filter.page = 1;

      const response = await sessionService.getSessions(filter);

      runInAction(() => {
        if (response?.total && response.total > sessionStore.total) {
          this.latestSessionCount = response.total - sessionStore.total;
        } else {
          this.latestSessionCount = 0;
        }
      });
    } catch (error) {
      console.error('Failed to check for latest session count:', error);
    }
  }

  addFilter(filter: any) {
    const index = filter.isEvent
      ? -1
      : this.instance.filters.findIndex(
        (i: FilterItem) => i.key === filter.key
      );

    filter.value = checkFilterValue(filter.value);
    filter.filters = filter.filters
      ? filter.filters.map((subFilter: any) => ({
        ...subFilter,
        value: checkFilterValue(subFilter.value)
      }))
      : null;

    if (index > -1) {
      const oldFilter = new FilterItem(this.instance.filters[index]);
      const updatedFilter = {
        ...oldFilter,
        value: oldFilter.value.concat(filter.value)
      };
      oldFilter.merge(updatedFilter);
      this.updateFilter(index, updatedFilter);
    } else {
      this.instance.filters.push(filter);
      this.instance = new Search({
        ...this.instance.toData()
      });
    }

    this.currentPage = 1;

    if (filter.value && filter.value[0] && filter.value[0] !== '') {
      void this.fetchSessions();
    }
  }

  addFilterByKeyAndValue(
    key: any,
    value: any,
    operator?: string,
    sourceOperator?: string,
    source?: string,
  ) {
    const defaultFilter = { ...filtersMap[key] };
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

  refreshFilterOptions() {
    // TODO
  }

  updateSearch = (search: Partial<Search>) => {
    this.instance = Object.assign(this.instance, search);
  };

  updateFilter = (index: number, search: Partial<FilterItem>) => {
    const newFilters = this.instance.filters.map((_filter: any, i: any) => {
      if (i === index) {
        return search;
      }
      return _filter;
    });

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters
    });
  };

  removeFilter = (index: number) => {
    const newFilters = this.instance.filters.filter(
      (_filter: any, i: any) => i !== index,
    );

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters
    });
  };

  setScrollPosition = (y: number) => {
    this.scrollY = y;
  };

  async fetchAutoplaySessions(page: number): Promise<void> {
    // TODO
  }

  fetchSessions = async (
    force: boolean = false,
    bookmarked: boolean = false,
  ): Promise<void> => {
    console.log(this.searchInProgress)
    if (this.searchInProgress) return;
    const filter = this.instance.toSearch();

    if (this.activeTags[0] && this.activeTags[0] !== 'all') {
      const tagFilter = filtersMap[FilterKey.ISSUE];
      tagFilter.type = tagFilter.type.toLowerCase();
      tagFilter.value = [
        issues_types.find((i: any) => i.type === this.activeTags[0])?.type
      ];
      delete tagFilter.operatorOptions;
      delete tagFilter.options;
      delete tagFilter.placeholder;
      delete tagFilter.label;
      delete tagFilter.icon;
      filter.filters = filter.filters.concat(tagFilter);
    }

    if (!filter.filters.some((f: any) => f.type === FilterKey.DURATION)) {
      const { durationFilter } = settingsStore.sessionSettings;
      if (durationFilter?.count > 0) {
        const multiplier = durationFilter.countType === 'sec' ? 1000 : 60000;
        const amount = durationFilter.count * multiplier;
        const value =
          durationFilter.operator === '<' ? [amount, 0] : [0, amount];

        filter.filters.push({
          type: FilterKey.DURATION,
          value,
          operator: 'is'
        });
      }
    }

    this.latestRequestTime = filter.startDate;
    this.latestList = List();
    this.searchInProgress = true;
    await sessionStore.fetchSessions(
      {
        ...filter,
        page: this.currentPage,
        perPage: this.pageSize,
        tab: this.activeTab.type,
        bookmarked: bookmarked ? true : undefined
      },
      force
    ).finally(() => {
      this.searchInProgress = false;
    });
  }
}

export default SearchStore;
