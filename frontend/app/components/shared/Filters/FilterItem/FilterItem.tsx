import React from 'react';
import { Button } from 'antd';
import { FilterKey, FilterType } from 'App/types/filter/filterType';
import { CircleMinus } from 'lucide-react';
import cn from 'classnames';
import FilterOperator from '../FilterOperator';
import FilterSelection from '../FilterSelection';
import FilterValue from '../FilterValue';
import FilterSource from '../FilterSource';
import SubFilterItem from '../SubFilterItem';

interface Props {
  filterIndex?: number;
  filter: any; // event/filter
  onUpdate: (filter: any) => void;
  onRemoveFilter: () => void;
  isFilter?: boolean;
  saveRequestPayloads?: boolean;
  disableDelete?: boolean;
  excludeFilterKeys?: Array<string>;
  excludeCategory?: Array<string>;
  allowedFilterKeys?: Array<string>;
  readonly?: boolean;
  hideIndex?: boolean;
  hideDelete?: boolean;
  isConditional?: boolean;
}

function FilterItem(props: Props) {
  const {
    isFilter = false,
    filterIndex,
    filter,
    saveRequestPayloads,
    disableDelete = false,
    hideDelete = false,
    allowedFilterKeys = [],
    excludeFilterKeys = [],
    excludeCategory = [],
    isConditional,
    hideIndex = false,
  } = props;
  const canShowValues = !(
    filter.operator === 'isAny' ||
    filter.operator === 'onAny' ||
    filter.operator === 'isUndefined'
  );
  const isSubFilter = filter.type === FilterType.SUB_FILTERS;
  const replaceFilter = (filter: any) => {
    props.onUpdate({
      ...filter,
      value: filter.value,
      filters: filter.filters
        ? filter.filters.map((i: any) => ({ ...i, value: [''] }))
        : [],
    });
  };

  const onOperatorChange = (e: any, { value }: any) => {
    props.onUpdate({ ...filter, operator: value });
  };

  const onSourceOperatorChange = (e: any, { value }: any) => {
    props.onUpdate({ ...filter, sourceOperator: value });
  };

  const onUpdateSubFilter = (subFilter: any, subFilterIndex: any) => {
    props.onUpdate({
      ...filter,
      filters: filter.filters.map((i: any, index: any) => {
        if (index === subFilterIndex) {
          return subFilter;
        }
        return i;
      }),
    });
  };

  const isReversed = filter.key === FilterKey.TAGGED_ELEMENT;
  return (
    <div className="flex items-center w-full">
      <div className="flex items-center w-full flex-wrap">
        {!isFilter && !hideIndex && filterIndex >= 0 && (
          <div className="flex-shrink-0 w-6 h-6 text-xs flex items-center justify-center rounded-full bg-gray-lighter	 mr-2">
            <span>{filterIndex + 1}</span>
          </div>
        )}
        <FilterSelection
          filter={filter}
          mode={props.isFilter ? 'filters' : 'events'}
          onFilterClick={replaceFilter}
          allowedFilterKeys={allowedFilterKeys}
          excludeFilterKeys={excludeFilterKeys}
          excludeCategory={excludeCategory}
          disabled={disableDelete || props.readonly}
        />

        <div
          className={cn(
            'flex items-center flex-wrap',
            isReversed ? 'flex-row-reverse ml-2' : 'flex-row',
          )}
        >
          {/* Filter with Source */}
          {filter.hasSource && (
            <>
              <FilterOperator
                options={filter.sourceOperatorOptions}
                onChange={onSourceOperatorChange}
                className="mx-2 flex-shrink-0 btn-event-operator"
                value={filter.sourceOperator}
                isDisabled={filter.operatorDisabled || props.readonly}
              />
              <FilterSource filter={filter} onUpdate={props.onUpdate} />
            </>
          )}

          {/* Filter values */}
          {!isSubFilter && filter.operatorOptions && (
            <>
              <FilterOperator
                options={filter.operatorOptions}
                onChange={onOperatorChange}
                className="mx-2 flex-shrink-0 btn-sub-event-operator"
                value={filter.operator}
                isDisabled={filter.operatorDisabled || props.readonly}
              />
              {canShowValues && (
                <>
                  {props.readonly ? (
                    <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip hover:border-neutral-400">
                      {filter.value
                        .map((val: string) =>
                          filter.options && filter.options.length
                            ? (filter.options[
                                filter.options.findIndex(
                                  (i: any) => i.value === val,
                                )
                              ]?.label ?? val)
                            : val,
                        )
                        .join(', ')}
                    </div>
                  ) : (
                    <FilterValue
                      isConditional={isConditional}
                      filter={filter}
                      onUpdate={props.onUpdate}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* filters */}
        {isSubFilter && (
          <div className="grid grid-col ml-3 w-full">
            {filter.filters
              .filter(
                (i: any) =>
                  (i.key !== FilterKey.FETCH_REQUEST_BODY &&
                    i.key !== FilterKey.FETCH_RESPONSE_BODY) ||
                  saveRequestPayloads,
              )
              .map((subFilter: any, subFilterIndex: any) => (
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
      {props.readonly || props.hideDelete ? null : (
        <div className="flex flex-shrink-0 self-start ml-auto">
          <Button
            disabled={disableDelete}
            type="text"
            onClick={props.onRemoveFilter}
            size="small"
            className="btn-remove-step mt-2"
          >
            <CircleMinus size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default FilterItem;
