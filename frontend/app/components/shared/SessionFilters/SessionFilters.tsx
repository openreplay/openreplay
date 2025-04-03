import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Button, Divider } from 'antd';
import { Plus } from 'lucide-react';
import cn from 'classnames';
import { Filter } from '@/mstore/types/filterConstants';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';

let debounceFetch: any = () => {
};

function SessionFilters() {
  const { searchStore, projectsStore, filterStore } =
    useStore();

  const searchInstance = searchStore.instance;
  const saveRequestPayloads =
    projectsStore.instance?.saveRequestPayloads ?? false;

  const allFilterOptions: Filter[] = filterStore.getCurrentProjectFilters();
  const eventOptions = allFilterOptions.filter(i => i.isEvent);
  const propertyOptions = allFilterOptions.filter(i => !i.isEvent);

  const onAddFilter = (filter: any) => {
    filter.autoOpen = true;
    searchStore.addFilter(filter);
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    searchStore.edit({
      eventsOrder: value
    });
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'bg-white',
          'py-2 px-4 rounded-xl border border-gray-lighter pt-4'
        )}
      >
        <FilterListHeader
          title={'Events'}
          showEventsOrder={searchInstance.filters.filter(i => i.isEvent).length > 0}
          orderProps={searchInstance}
          onChangeOrder={onChangeEventsOrder}
          filterSelection={
            <FilterSelection
              filters={eventOptions}
              onFilterClick={(newFilter) => {
                console.log('newFilter', newFilter);
                onAddFilter(newFilter);
              }}>
              <Button type="default" size="small">
                <div className="flex items-center gap-1">
                  <Plus size={16} strokeWidth={1} />
                  <span>Add Event</span>
                </div>
              </Button>
            </FilterSelection>
          }
        />

        <UnifiedFilterList
          title="Events"
          filters={searchInstance.filters.filter(i => i.isEvent)}
          isDraggable={true}
          showIndices={true}
          className="mt-2"
          handleRemove={function(key: string): void {
            searchStore.removeFilter(key);
          }}
          handleUpdate={function(key: string, updatedFilter: any): void {
            searchStore.updateFilter(key, updatedFilter);
          }}
          handleAdd={function(newFilter: Filter): void {
            searchStore.addFilter(newFilter);
          }}
          handleMove={function(draggedIndex: number, newPosition: number): void {
            searchStore.moveFilter(draggedIndex, newPosition);
          }}
        />

        <Divider className="my-3" />

        <FilterListHeader
          title={'Filters'}
          filterSelection={
            <FilterSelection
              filters={propertyOptions}
              onFilterClick={(newFilter) => {
                onAddFilter(newFilter);
              }}
            >
              <Button type="default" size="small">
                <div className="flex items-center gap-1">
                  <Plus size={16} strokeWidth={1} />
                  <span>Filter</span>
                </div>
              </Button>
            </FilterSelection>
          } />

        <UnifiedFilterList
          title="Filters"
          filters={searchInstance.filters.filter(i => !i.isEvent)}
          className="mt-2"
          isDraggable={false}
          showIndices={false}
          handleRemove={function(key: string): void {
            searchStore.removeFilter(key);
          }}
          handleUpdate={function(key: string, updatedFilter: any): void {
            searchStore.updateFilter(key, updatedFilter);
          }}
          handleAdd={function(newFilter: Filter): void {
            searchStore.addFilter(newFilter);
          }}
          handleMove={function(draggedIndex: number, newPosition: number): void {
            searchStore.moveFilter(draggedIndex, newPosition);
          }}
        />
      </div>
    </div>
  );
}

export default observer(SessionFilters);
