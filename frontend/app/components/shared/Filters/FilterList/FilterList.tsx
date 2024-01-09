import React, { useEffect } from 'react';
import FilterItem from '../FilterItem';
import { SegmentSelection, Tooltip } from 'UI';
import { List } from 'immutable';
import { useObserver } from 'mobx-react-lite';

interface Props {
  filter?: any; // event/filter
  onUpdateFilter: (filterIndex: any, filter: any) => void;
  onRemoveFilter: (filterIndex: any) => void;
  onChangeEventsOrder: (e: any, { name, value }: any) => void;
  hideEventsOrder?: boolean;
  observeChanges?: () => void;
  saveRequestPayloads?: boolean;
  supportsEmpty?: boolean
  readonly?: boolean;
  excludeFilterKeys?: Array<string>
  isConditional?: boolean;
}
function FilterList(props: Props) {
  const {
    observeChanges = () => {},
    filter,
    hideEventsOrder = false,
    saveRequestPayloads,
    supportsEmpty = true,
    excludeFilterKeys = [],
    isConditional,
  } = props;

  const filters = List(filter.filters);
  const eventsOrderSupport = filter.eventsOrderSupport;
  const hasEvents = filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = filters.filter((i: any) => !i.isEvent).size > 0;

  let rowIndex = 0;
  const cannotDeleteFilter = hasEvents && !supportsEmpty;

  useEffect(observeChanges, [filters]);

  const onRemoveFilter = (filterIndex: any) => {
    props.onRemoveFilter(filterIndex);
  };

  return useObserver(() => (
    <div className="flex flex-col">
      {hasEvents && (
        <>
          <div className="flex items-center mb-2">
            <div className="text-sm color-gray-medium mr-auto">{filter.eventsHeader}</div>
            {!hideEventsOrder && (
              <div className="flex items-center">
                <div
                  className="mr-2 color-gray-medium text-sm"
                  style={{ textDecoration: 'underline dotted' }}
                >
                  <Tooltip
                    title={`Select the operator to be applied between events in your search.`}
                  >
                    <div>Events Order</div>
                  </Tooltip>
                </div>

                <SegmentSelection
                  primary
                  name="eventsOrder"
                  size="small"
                  onSelect={props.onChangeEventsOrder}
                  value={{ value: filter.eventsOrder }}
                  list={[
                    { name: 'THEN', value: 'then', disabled: eventsOrderSupport && !eventsOrderSupport.includes('then') },
                    { name: 'AND', value: 'and', disabled: eventsOrderSupport && !eventsOrderSupport.includes('and')},
                    { name: 'OR', value: 'or', disabled: eventsOrderSupport && !eventsOrderSupport.includes('or')},
                  ]}
                />
              </div>
            )}
          </div>
          {filters.map((filter: any, filterIndex: any) =>
            filter.isEvent ? (
              <FilterItem
                key={`${filter.key}-${filterIndex}`}
                filterIndex={rowIndex++}
                filter={filter}
                onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
                onRemoveFilter={() => onRemoveFilter(filterIndex)}
                saveRequestPayloads={saveRequestPayloads}
                disableDelete={cannotDeleteFilter}
                excludeFilterKeys={excludeFilterKeys}
                readonly={props.readonly}
                isConditional={isConditional}
              />
            ) : null
          )}
          <div className="mb-2" />
        </>
      )}

      {hasFilters && (
        <>
          {hasEvents && <div className="border-t -mx-5 mb-4" />}
          <div className="mb-2 text-sm color-gray-medium mr-auto">FILTERS</div>
          {filters.map((filter: any, filterIndex: any) =>
            !filter.isEvent ? (
              <FilterItem
                key={filterIndex}
                readonly={props.readonly}
                isFilter={true}
                filterIndex={filterIndex}
                filter={filter}
                onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
                onRemoveFilter={() => onRemoveFilter(filterIndex)}
                excludeFilterKeys={excludeFilterKeys}
                isConditional={isConditional}
              />
            ) : null
          )}
        </>
      )}
    </div>
  ));
}

export default FilterList;
