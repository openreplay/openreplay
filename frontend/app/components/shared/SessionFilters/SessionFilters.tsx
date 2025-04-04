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
    { value }: { value: string }
  ) => {
    searchStore.edit({
      eventsOrder: value
    });
  };

  const eventFilters = searchInstance.filters.filter((i) => i.isEvent);
  const attributeFilters = searchInstance.filters.filter((i) => !i.isEvent);

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
        handleRemove={searchStore.removeFilter}
        handleUpdate={searchStore.updateFilter}
        handleAdd={searchStore.addFilter}
        handleMove={searchStore.moveFilter}
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
        handleRemove={searchStore.removeFilter}
        handleUpdate={searchStore.updateFilter}
        handleAdd={searchStore.addFilter}
        handleMove={searchStore.moveFilter}
      />
    </Card>
  );
}

export default observer(SessionFilters);
