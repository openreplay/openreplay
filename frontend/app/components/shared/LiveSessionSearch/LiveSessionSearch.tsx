import React, { useEffect } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

function LiveSessionSearch() {
  const { projectsStore, searchStoreLive } = useStore();
  const saveRequestPayloads = projectsStore.active?.saveRequestPayloads;
  const appliedFilter = searchStoreLive.instance;

  useEffect(() => {
    void searchStoreLive.fetchSessions();
  }, []);

  const onAddFilter = (filter: any) => {
    searchStoreLive.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex: number, filter: any) => {
    searchStoreLive.updateFilter(filterIndex, filter);
    void searchStoreLive.fetchSessions();
  };

  const onRemoveFilter = (filterIndex: number) => {
    const newFilters = appliedFilter.filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    searchStoreLive.edit({
      filters: newFilters,
    });

    void searchStoreLive.fetchSessions();
  };

  const onChangeEventsOrder = (e: any, { name, value }: any) => {
    searchStoreLive.edit({
      eventsOrder: value,
    });

    void searchStoreLive.fetchSessions();
  };

  return (
    <FilterList
      filter={appliedFilter}
      onAddFilter={onAddFilter}
      onUpdateFilter={onUpdateFilter}
      onRemoveFilter={onRemoveFilter}
      onChangeEventsOrder={onChangeEventsOrder}
      saveRequestPayloads={saveRequestPayloads}
      onlyFilters={true}
    />
  );
}

export default observer(LiveSessionSearch);
