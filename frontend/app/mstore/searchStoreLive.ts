import { getRowsPerPage } from '@/ui/layout/rows-per-page';
import { makeAutoObservable, reaction } from 'mobx';

import { sessionStore } from 'App/mstore';
import { checkFilterValue } from 'App/mstore/types/filter';
import FilterItem, { IFilter } from 'App/mstore/types/filterItem';
import Search from 'App/mstore/types/search';

class SearchStoreLive {
  list = [];
  instance = new Search({ sort: 'timestamp', order: 'desc' });
  currentPage = 1;
  loading = false;
  /** the Fit list the page size comes from: the CoBrowse page, not the multiview picker */
  rowsList: string | undefined = undefined;

  constructor() {
    makeAutoObservable(this);

    // Reset currentPage to 1 only on filter changes
    reaction(
      () => this.instance,
      () => {
        this.currentPage = 1;
        // a new question supersedes whatever is in flight
        void this.fetchSessions(true);
      },
    );

    // Fetch sessions when currentPage changes
    reaction(
      () => this.currentPage,
      () => {
        void this.fetchSessions(true);
      },
    );
  }

  edit(instance: Partial<Search>) {
    this.instance = new Search({ ...this.instance, ...instance });
  }

  updateCurrentPage(page: number) {
    this.currentPage = page;
  }

  clearSearch() {
    const { instance } = this;
    this.edit(
      new Search({
        rangeValue: instance.rangeValue,
        startDate: instance.startDate,
        endDate: instance.endDate,
        filters: [],
      }),
    );
  }

  addFilter(filter: any) {
    const index = this.instance.filters.findIndex(
      (i: FilterItem) => i.name === filter.name,
    );

    filter.value = checkFilterValue(filter.value);
    filter.filters = filter.filters
      ? filter.filters.map((subFilter: any) => ({
          ...subFilter,
          value: checkFilterValue(subFilter.value),
        }))
      : null;

    if (index > -1) {
      // Update existing filter
      // @ts-ignore
      this.instance.filters[index] = {
        ...this.instance.filters[index],
        value: this.instance.filters[index].value.concat(filter.value),
      };
    } else {
      // Add new filter (create a new array reference to notify MobX)
      this.instance.filters = [...this.instance.filters, filter];
    }

    this.instance = new Search({
      ...this.instance.toData(),
    });
  }

  updateFilter = (index: number, search: Partial<IFilter>) => {
    const newFilters = this.instance.filters.map((_filter: any, i: any) => {
      if (i === index) {
        search.value = checkFilterValue(search.value);
        return search;
      }
      return _filter;
    });

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters,
    });
  };

  removeFilter = (index: number) => {
    const newFilters = this.instance.filters.filter(
      (_filter: any, i: any) => i !== index,
    );

    this.instance = new Search({
      ...this.instance.toData(),
      filters: newFilters,
    });
  };

  setLoading = (val: boolean) => {
    this.loading = val;
  };

  setRowsList = (list?: string) => {
    this.rowsList = list;
  };

  private fetchSeq = 0;

  /** Unforced calls (the poll) skip while a request is in flight; forced ones
      supersede it, and only the latest response is applied. */
  fetchSessions = async (force?: boolean) => {
    if (!force && this.loading) {
      return;
    }
    const seq = ++this.fetchSeq;
    this.setLoading(true);
    try {
      await sessionStore.fetchLiveSessions(
        {
          ...this.instance.toSearch(),
          page: this.currentPage,
          limit: getRowsPerPage(this.rowsList),
        },
        () => seq !== this.fetchSeq,
      );
    } catch (e) {
      console.error('Error fetching sessions:', e);
    } finally {
      if (seq === this.fetchSeq) this.setLoading(false);
    }
  };
}

export default SearchStoreLive;
