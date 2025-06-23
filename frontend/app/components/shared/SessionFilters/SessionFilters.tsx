import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Button, Divider, Card } from 'antd';
import { Plus } from 'lucide-react';
import { Filter } from '@/mstore/types/filterConstants';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';

function SessionFilters() {
  const { searchStore, filterStore } = useStore();
  const searchInstance = searchStore.instance;

  const allFilterOptions: Filter[] = filterStore.getCurrentProjectFilters();
  const eventOptions = allFilterOptions.filter((i) => i.isEvent);
  const propertyOptions = allFilterOptions.filter((i) => !i.isEvent);

  const onAddFilter = (filter: Filter) => {
    searchStore.addFilter({ ...filter, autoOpen: true });
  };

  const onChangeEventsOrder = (
    _e: React.MouseEvent<HTMLButtonElement>,
    { value }: { value: string },
  ) => {
    searchStore.edit({
      eventsOrder: value,
    });
  };

  // Create filtered arrays with original indices
  const eventFiltersWithIndices = searchInstance.filters
    .map((filter, originalIndex) => ({ filter, originalIndex }))
    .filter(({ filter }) => filter.isEvent);

  const attributeFiltersWithIndices = searchInstance.filters
    .map((filter, originalIndex) => ({ filter, originalIndex }))
    .filter(({ filter }) => !filter.isEvent);

  const eventFilters = eventFiltersWithIndices.map(({ filter }) => filter);
  const attributeFilters = attributeFiltersWithIndices.map(
    ({ filter }) => filter,
  );

  // Create index mapping functions
  const getOriginalEventIndex = (filteredIndex: number) => {
    return eventFiltersWithIndices[filteredIndex]?.originalIndex ?? -1;
  };

  const getOriginalAttributeIndex = (filteredIndex: number) => {
    return attributeFiltersWithIndices[filteredIndex]?.originalIndex ?? -1;
  };

  // Wrapper functions for event operations
  const handleEventRemove = (filteredIndex: number) => {
    const originalIndex = getOriginalEventIndex(filteredIndex);
    if (originalIndex !== -1) {
      searchStore.removeFilter(originalIndex);
    }
  };

  const handleEventUpdate = (filteredIndex: number, updatedFilter: Filter) => {
    const originalIndex = getOriginalEventIndex(filteredIndex);
    if (originalIndex !== -1) {
      searchStore.updateFilter(originalIndex, updatedFilter);
    }
  };

  // Wrapper functions for attribute operations
  const handleAttributeRemove = (filteredIndex: number) => {
    const originalIndex = getOriginalAttributeIndex(filteredIndex);
    if (originalIndex !== -1) {
      searchStore.removeFilter(originalIndex);
    }
  };

  const handleAttributeUpdate = (
    filteredIndex: number,
    updatedFilter: Filter,
  ) => {
    const originalIndex = getOriginalAttributeIndex(filteredIndex);
    if (originalIndex !== -1) {
      searchStore.updateFilter(originalIndex, updatedFilter);
    }
  };

  // Move function for events only (since only events are draggable)
  const moveEventFilter = (
    fromFilteredIndex: number,
    toFilteredIndex: number,
  ) => {
    const fromOriginalIndex = getOriginalEventIndex(fromFilteredIndex);
    const toOriginalIndex = getOriginalEventIndex(toFilteredIndex);

    if (fromOriginalIndex !== -1 && toOriginalIndex !== -1) {
      const updatedFilters = [...searchInstance.filters];
      const filterToMove = updatedFilters.splice(fromOriginalIndex, 1)[0];
      updatedFilters.splice(toOriginalIndex, 0, filterToMove);
      searchStore.edit({ filters: updatedFilters });
    }
  };

  return (
    <Card className="rounded-lg" classNames={{ body: '!p-4' }}>
      <FilterListHeader
        title={'Events'}
        showEventsOrder={eventFilters.length > 0}
        orderProps={searchInstance}
        onChangeOrder={onChangeEventsOrder}
        filterSelection={
          <FilterSelection
            filters={eventOptions}
            onFilterClick={(newFilter: Filter) => {
              onAddFilter(newFilter);
            }}
          >
            <Button type="default" size="small">
              <div className="flex items-center gap-1">
                <Plus size={16} strokeWidth={1} />
                <span>Add</span>
              </div>
            </Button>
          </FilterSelection>
        }
      />

      <UnifiedFilterList
        title="Events"
        filters={eventFilters}
        isDraggable={true}
        showIndices={true}
        className="mt-2"
        handleRemove={handleEventRemove}
        handleUpdate={handleEventUpdate}
        handleAdd={(filter) => {
          filter.filters = [];
          searchStore.addFilter(filter);
        }}
        handleMove={moveEventFilter}
      />

      <Divider className="my-3" />

      <FilterListHeader
        title={'Filters'}
        filterSelection={
          <FilterSelection
            filters={propertyOptions}
            onFilterClick={(newFilter: Filter) => {
              onAddFilter(newFilter);
            }}
          >
            <Button type="default" size="small">
              <div className="flex items-center gap-1">
                <Plus size={16} strokeWidth={1} />
                <span>Add</span>
              </div>
            </Button>
          </FilterSelection>
        }
      />

      <UnifiedFilterList
        title="Filters"
        filters={attributeFilters}
        className="mt-2"
        isDraggable={false}
        showIndices={false}
        handleRemove={handleAttributeRemove}
        handleUpdate={handleAttributeUpdate}
        handleAdd={searchStore.addFilter}
      />
    </Card>
  );
}

export default observer(SessionFilters);
