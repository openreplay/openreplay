import React, { useState} from 'react';
import FilterItem from '../FilterItem';
import { SegmentSelection } from 'UI';

interface Props {
  // filters: any[]; // event/filter
  filter?: any; // event/filter
  onUpdateFilter: (filterIndex, filter) => void;
  onRemoveFilter: (filterIndex) => void;
  onChangeEventsOrder: (e, { name, value }) => void;
}
function FilterList(props: Props) {
  const { filter } = props;
  const filters = filter.filters;
  const hasEvents = filter.filters.filter(i => i.isEvent).size > 0;
  const hasFilters = filter.filters.filter(i => !i.isEvent).size > 0;

  const onRemoveFilter = (filterIndex) => {
    const newFilters = filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.onRemoveFilter(filterIndex);
  }

  return (
    <div className="flex flex-col">
      { hasEvents && (
        <>
          <div className="flex items-center mb-2">
            <div className="mb-2 text-sm color-gray-medium mr-auto">EVENTS</div>
            <div className="flex items-center">
              <div className="mr-2 color-gray-medium text-sm">Events Order</div>
              <SegmentSelection
                primary
                name="eventsOrder"
                extraSmall={true}
                // className="my-3"
                onSelect={props.onChangeEventsOrder}
                // onSelect={() => null }
                value={{ value: filter.eventsOrder }}
                // value={{ value: 'and' }}
                list={ [
                  { name: 'AND', value: 'and' },
                  { name: 'OR', value: 'or' },
                  { name: 'THEN', value: 'then' },
                ]}
              />
            </div>
          </div>
          {filters.map((filter, filterIndex) => filter.isEvent ? (
            <FilterItem
              filterIndex={filterIndex}
              filter={filter}
              onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
              onRemoveFilter={() => onRemoveFilter(filterIndex) }
            />
          ): null)}
          <div className='mb-2' />
        </>
      )}

      {hasFilters && (
        <>
          <div className='border-t -mx-5 mb-2' />
          <div className="mb-2 text-sm color-gray-medium mr-auto">FILTERS</div>
          {filters.map((filter, filterIndex) => !filter.isEvent ? (
            <FilterItem
              isFilter={true}
              filterIndex={filterIndex}
              filter={filter}
              onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
              onRemoveFilter={() => onRemoveFilter(filterIndex) }
            />
          ): null)}
        </>
      )}
    </div>
  );
}

export default FilterList;