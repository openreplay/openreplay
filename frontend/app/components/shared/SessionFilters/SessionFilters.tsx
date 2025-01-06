import React, { useEffect } from 'react';
import { debounce } from 'App/utils';
import { FilterList, EventsList } from 'Shared/Filters/FilterList';

import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import useSessionSearchQueryHandler from 'App/hooks/useSessionSearchQueryHandler';
import { FilterKey } from 'App/types/filter/filterType';
import { addOptionsToFilter } from 'App/types/filter/newFilter';

let debounceFetch: any = () => {};
function SessionFilters() {
  const {
    searchStore,
    projectsStore,
    customFieldStore,
    tagWatchStore,
  } = useStore();

  const appliedFilter = searchStore.instance;
  const metaLoading = customFieldStore.isLoading;
  const saveRequestPayloads =
    projectsStore.instance?.saveRequestPayloads ?? false;
  const activeProject = projectsStore.active

  useEffect(() => {
    if (searchStore.instance.filters.length === 0 && activeProject?.platform !== 'web') {
      searchStore.addFilterByKeyAndValue(FilterKey.LOCATION, '', 'isAny')
    }
  }, [projectsStore.activeSiteId, activeProject])

  useSessionSearchQueryHandler({
    appliedFilter,
    loading: metaLoading,
    onBeforeLoad: async () => {
      const tags = await tagWatchStore.getTags();
      if (tags) {
        addOptionsToFilter(
          FilterKey.TAGGED_ELEMENT,
          tags.map((tag) => ({
            label: tag.name,
            value: tag.tagId.toString(),
          }))
        );
        searchStore.refreshFilterOptions();
      }
    },
  });

  useEffect(() => {
    debounceFetch = debounce(() => searchStore.fetchSessions(), 500);
  }, []);

  useEffect(() => {
    debounceFetch();
  }, [appliedFilter.filters]);

  const onAddFilter = (filter: any) => {
    searchStore.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    searchStore.updateFilter(filterIndex, filter);
  };

  const onFilterMove = (newFilters: any) => {
    searchStore.updateFilter(0, {
      ...appliedFilter,
      filters: newFilters,
    });

    debounceFetch();
  };

  const onRemoveFilter = (filterIndex: any) => {
    searchStore.removeFilter(filterIndex);

    debounceFetch();
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    searchStore.edit({
      eventsOrder: value,
    });

    debounceFetch();
  };

  return (
    <div className="relative">
      <EventsList
        filter={appliedFilter}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onRemoveFilter={onRemoveFilter}
        onChangeEventsOrder={onChangeEventsOrder}
        saveRequestPayloads={saveRequestPayloads}
        onFilterMove={onFilterMove}
        mergeDown
      />
      <FilterList
        mergeUp
        filter={appliedFilter}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onRemoveFilter={onRemoveFilter}
        onChangeEventsOrder={onChangeEventsOrder}
        saveRequestPayloads={saveRequestPayloads}
        onFilterMove={onFilterMove}
      />
    </div>
  );
}

export default observer(SessionFilters);
