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
  const { searchStore, projectsStore, customFieldStore, tagWatchStore } =
    useStore();

  const appliedFilter = searchStore.instance;
  const metaLoading = customFieldStore.isLoading;
  const saveRequestPayloads =
    projectsStore.instance?.saveRequestPayloads ?? false;
  const activeProject = projectsStore.active;

  const reloadTags = async () => {
    const tags = await tagWatchStore.getTags();
    if (tags) {
      addOptionsToFilter(
        FilterKey.TAGGED_ELEMENT,
        tags.map((tag) => ({
          label: tag.name,
          value: tag.tagId.toString(),
        })),
      );
      searchStore.refreshFilterOptions();
    }
  };

  useEffect(() => {
    // Add default location/screen filter if no filters are present
    if (searchStore.instance.filters.length === 0) {
      searchStore.addFilterByKeyAndValue(
        activeProject?.platform === 'web'
          ? FilterKey.LOCATION
          : FilterKey.VIEW_MOBILE,
        '',
        'isAny',
      );
    }
    void reloadTags();
  }, [projectsStore.activeSiteId, activeProject]);

  useSessionSearchQueryHandler({
    appliedFilter,
    loading: metaLoading,
    onBeforeLoad: async () => {
      await reloadTags();
    },
  });

  const onAddFilter = (filter: any) => {
    filter.autoOpen = true;
    searchStore.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    searchStore.updateFilter(filterIndex, filter);
  };

  const onFilterMove = (newFilters: any) => {
    searchStore.updateSearch({ ...appliedFilter, filters: newFilters});
    // debounceFetch();
  };

  const onRemoveFilter = (filterIndex: any) => {
    searchStore.removeFilter(filterIndex);

    // debounceFetch();
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    searchStore.edit({
      eventsOrder: value,
    });

    // debounceFetch();
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
