import React, { useEffect } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import SaveFilterButton from 'Shared/SaveFilterButton';
import { FilterKey } from 'Types/filter/filterType';
import { addOptionsToFilter } from 'Types/filter/newFilter';
import { Button, Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';
import useSessionSearchQueryHandler from 'App/hooks/useSessionSearchQueryHandler';

let debounceFetch: () => void;

function SessionSearch() {
  const { tagWatchStore, aiFiltersStore, searchStore, customFieldStore, projectsStore } = useStore();
  const appliedFilter = searchStore.instance;
  const metaLoading = customFieldStore.isLoading;
  const hasEvents = appliedFilter.filters.some((i: any) => i.isEvent);
  const hasFilters = appliedFilter.filters.some((i: any) => !i.isEvent);
  const saveRequestPayloads = projectsStore.instance?.saveRequestPayloads ?? false;

  useSessionSearchQueryHandler({
    appliedFilter,
    loading: metaLoading,
    onBeforeLoad: async () => {
      try {
        const tags = await tagWatchStore.getTags();
        if (tags) {
          addOptionsToFilter(
            FilterKey.TAGGED_ELEMENT,
            tags.map((tag) => ({
              label: tag.name,
              value: tag.tagId.toString()
            }))
          );
          searchStore.refreshFilterOptions();
        }
      } catch (error) {
        console.error('Error during onBeforeLoad:', error);
      }
    }
  });

  useEffect(() => {
    debounceFetch = debounce(() => searchStore.fetchSessions(), 500);
  }, [searchStore]);

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
      filters: newFilters
    });

    debounceFetch();
  };

  const onRemoveFilter = (filterIndex: any) => {
    const newFilters = appliedFilter.filters.filter((_filter: any, i: any) => {
      return i !== filterIndex;
    });

    searchStore.removeFilter(filterIndex);

    debounceFetch();
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    searchStore.edit({
      eventsOrder: value
    });

    debounceFetch();
  };

  const showPanel = hasEvents || hasFilters || aiFiltersStore.isLoading;

  if (metaLoading) return null;
  if (!showPanel) return null;

  return (
    <div className="border bg-white rounded-lg mt-4">
      <div className="p-5">
        {aiFiltersStore.isLoading ? (
          <div className={'font-semibold flex items-center gap-2 mb-2'}>
            <AnimatedSVG name={ICONS.LOADER} size={18} />
            <span>Translating your query into search steps...</span>
          </div>
        ) : null}
        {hasEvents || hasFilters ? (
          <FilterList
            filter={appliedFilter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onChangeEventsOrder={onChangeEventsOrder}
            onFilterMove={onFilterMove}
            saveRequestPayloads={saveRequestPayloads}
          />
        ) : null}
      </div>

      {hasEvents || hasFilters ? (
        <div className="border-t px-5 py-1 flex items-center -mx-2">
          <div>
            <FilterSelection filter={undefined} onFilterClick={onAddFilter}>
              <Button variant="text-primary" className="mr-2" icon="plus">
                ADD STEP
              </Button>
            </FilterSelection>
          </div>
          <div className="ml-auto flex items-center">
            <SaveFilterButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default observer(SessionSearch);
