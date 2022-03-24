import React, { useState} from 'react';
import FilterItem from '../FilterItem';
import { SegmentSelection, Popup } from 'UI';
import { List } from 'immutable';
import { useObserver } from 'mobx-react-lite';

interface Props {
  // filters: any[]; // event/filter
  filter?: any; // event/filter
  onUpdateFilter: (filterIndex, filter) => void;
  onRemoveFilter: (filterIndex) => void;
  onChangeEventsOrder: (e, { name, value }) => void;
  hideEventsOrder?: boolean;
}
function FilterList(props: Props) {
  const { filter, hideEventsOrder = false } = props;
  const filters = List(filter.filters);
  const hasEvents = filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = filters.filter((i: any) => !i.isEvent).size > 0;
  let rowIndex = 0;

  const onRemoveFilter = (filterIndex) => {
    props.onRemoveFilter(filterIndex);
  }

  return useObserver(() => (
    <div className="flex flex-col">
      { hasEvents && (
        <>
          <div className="flex items-center mb-2">
            <div className="text-sm color-gray-medium mr-auto">EVENTS</div>
            { !hideEventsOrder && (
              <div className="flex items-center">
                <div className="mr-2 color-gray-medium text-sm" style={{ textDecoration: 'underline dotted'}}>
                  <Popup
                    trigger={<div>Events Order</div>}
                    content={ `Select the operator to be applied between events in your search.` }
                    size="tiny"
                    inverted
                    position="top center"
                  />
                </div>
              
                <SegmentSelection
                  primary
                  name="eventsOrder"
                  extraSmall={true}
                  onSelect={props.onChangeEventsOrder}
                  value={{ value: filter.eventsOrder }}
                  list={ [
                    { name: 'THEN', value: 'then' },
                    { name: 'AND', value: 'and' },
                    { name: 'OR', value: 'or' },
                  ]}
                />
              </div>
            )}
          </div>
          {filters.map((filter: any, filterIndex: any) => filter.isEvent ? (
            <FilterItem
              key={filterIndex}
              filterIndex={rowIndex++}
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
          {hasEvents && <div className='border-t -mx-5 mb-4' />}
          <div className="mb-2 text-sm color-gray-medium mr-auto">FILTERS</div>
          {filters.map((filter: any, filterIndex: any) => !filter.isEvent ? (
            <FilterItem
              key={filterIndex}
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
  ));
}

export default FilterList;