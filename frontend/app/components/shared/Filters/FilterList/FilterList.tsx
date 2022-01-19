import React, { useState} from 'react';
import FilterItem from '../FilterItem';
import { SegmentSelection } from 'UI';

interface Props {
  filters: any[]; // event/filter
  onUpdateFilter: (filterIndex, filter) => void;
  onRemoveFilter: (filterIndex) => void;
}
function FilterList(props: Props) {
  const { filters } = props;

  const onRemoveFilter = (filterIndex) => {
    const newFilters = filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.onRemoveFilter(filterIndex);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-2">
        <div className="mb-2 text-sm color-gray-medium mr-auto">EVENTS</div>
        <div className="flex items-center">
          <div className="mr-2 color-gray-medium text-sm">Events Order</div>
          <SegmentSelection
            primary
            name="eventsOrder"
            extraSmall={true}
            // className="my-3"
            // onSelect={onChangeEventsOrder }
            onSelect={() => null }
            // value={{ value: series.filter.eventsOrder }}
            value={{ value: 'and' }}
            list={ [
              { name: 'AND', value: 'and' },
              { name: 'OR', value: 'or' },
              { name: 'THEN', value: 'then' },
            ]}
          />
        </div>
      </div>
      {filters.map((filter, filterIndex) => (
        <FilterItem
          filterIndex={filterIndex}
          filter={filter}
          onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
          onRemoveFilter={() => onRemoveFilter(filterIndex) }
        />
      ))}

      {/* <div>Filters</div>
      {filters.filter(f => !f.isEvent).map((filter, filterIndex) => (
        <FilterItem
          filterIndex={filter.index}
          filter={filter}
          onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
          onRemoveFilter={() => onRemoveFilter(filterIndex) }
        />
      ))} */}
    </div>
  );
}

export default FilterList;