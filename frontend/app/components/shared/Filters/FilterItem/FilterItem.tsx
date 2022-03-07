import React from 'react';
import FilterOperator from '../FilterOperator';
import FilterSelection from '../FilterSelection';
import FilterValue from '../FilterValue';
import { Icon } from 'UI';
import FilterSource from '../FilterSource';
import { FilterType } from 'App/types/filter/filterType';
import SubFilterItem from '../SubFilterItem';

interface Props {
  filterIndex: number;
  filter: any; // event/filter
  onUpdate: (filter) => void;
  onRemoveFilter: () => void;
  isFilter?: boolean;
}
function FilterItem(props: Props) {
  const { isFilter = false, filterIndex, filter } = props;
  const canShowValues = !(filter.operator === "isAny" || filter.operator === "onAny" || filter.operator === "isUndefined");
  const isSubFilter = filter.type === FilterType.SUB_FILTERS;

  const replaceFilter = (filter) => {
    props.onUpdate({ 
      ...filter,
      value: [""],
      filters: filter.filters ? filter.filters.map(i => ({ ...i, value: [""] })) : []
    });
  };

  const onOperatorChange = (e, { name, value }) => {
    props.onUpdate({ ...filter, operator: value })
  }
  
  const onSourceOperatorChange = (e, { name, value }) => {
    props.onUpdate({ ...filter, sourceOperator: value })
  }

  const onUpdateSubFilter = (subFilter, subFilterIndex) => {
    props.onUpdate({
      ...filter,
      filters: filter.filters.map((i, index) => {
        if (index === subFilterIndex) {
          return subFilter;
        }
        return i;
      })
    });
  };


  return (
    <div className="flex items-center hover:bg-active-blue -mx-5 px-5 py-2">
      <div className="flex items-start w-full">
        { !isFilter && <div className="mt-1 flex-shrink-0 border w-6 h-6 text-xs flex justify-center rounded-full bg-gray-light-shade mr-2">{filterIndex+1}</div> }
        <FilterSelection filter={filter} onFilterClick={replaceFilter} />
        
        {/* Filter with Source */}
        { filter.hasSource && (
          <>
            <FilterOperator
              options={filter.sourceOperatorOptions}
              onChange={onSourceOperatorChange}
              className="mx-2 flex-shrink-0"
              value={filter.sourceOperator}
            />
            <FilterSource filter={filter} onUpdate={props.onUpdate} />
          </>
        )}

        {/* Filter values */}
        { !isSubFilter && (
          <>
            <FilterOperator
              options={filter.operatorOptions}
              onChange={onOperatorChange}
              className="mx-2 flex-shrink-0"
              value={filter.operator}
            />
            { canShowValues && (<FilterValue filter={filter} onUpdate={props.onUpdate} />) }
          </>
        )}

        {/* filters */}
        {isSubFilter && (
          <div className="grid grid-col ml-3 w-full">
            {filter.filters.map((subFilter, subFilterIndex) => (
              <SubFilterItem
                filterIndex={subFilterIndex}
                filter={subFilter}
                onUpdate={(f) => onUpdateSubFilter(f, subFilterIndex)}
                onRemoveFilter={props.onRemoveFilter}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 self-start mt-1 ml-auto px-2">
        <div
          className="cursor-pointer p-1"
          onClick={props.onRemoveFilter}
        > 
          <Icon name="trash" size="14" />
        </div>
      </div>
    </div>
  );
}

export default FilterItem;