import React from 'react';
import FilterOperator from '../FilterOperator';
import FilterSelection from '../FilterSelection';
import FilterValue from '../FilterValue';
import { Button } from 'UI';
import FilterSource from '../FilterSource';
import { FilterKey, FilterType } from 'App/types/filter/filterType';
import SubFilterItem from '../SubFilterItem';
import {toJS} from "mobx";

interface Props {
  filterIndex?: number;
  filter: any; // event/filter
  onUpdate: (filter: any) => void;
  onRemoveFilter: () => void;
  isFilter?: boolean;
  saveRequestPayloads?: boolean;
  disableDelete?: boolean;
  excludeFilterKeys?: Array<string>;
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
    isConditional,
    hideIndex = false,
  } = props;
  const canShowValues = !(filter.operator === 'isAny' || filter.operator === 'onAny' || filter.operator === 'isUndefined');
  const isSubFilter = filter.type === FilterType.SUB_FILTERS;
  const replaceFilter = (filter: any) => {
    props.onUpdate({
      ...filter,
      value: [''],
      filters: filter.filters ? filter.filters.map((i: any) => ({...i, value: ['']})) : [],
    });
  };

  const onOperatorChange = (e: any, {value}: any) => {
    props.onUpdate({...filter, operator: value});
  };

  const onSourceOperatorChange = (e: any, {value}: any) => {
    props.onUpdate({...filter, sourceOperator: value});
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

  return (
    <div className="flex items-center hover:bg-active-blue -mx-5 px-5 py-2">
      <div className="flex items-start w-full">
        {!isFilter && !hideIndex && filterIndex >= 0 && (
          <div
            className="mt-1 flex-shrink-0 border w-6 h-6 text-xs flex items-center justify-center rounded-full bg-gray-light-shade mr-2">
            <span>{filterIndex + 1}</span>
          </div>
        )}
        <FilterSelection
          filter={filter}
          onFilterClick={replaceFilter}
          allowedFilterKeys={allowedFilterKeys}
          excludeFilterKeys={excludeFilterKeys}
          disabled={disableDelete || props.readonly}
        />

        {/* Filter with Source */}
        {filter.hasSource && (
          <>
            <FilterOperator
              options={filter.sourceOperatorOptions}
              onChange={onSourceOperatorChange}
              className="mx-2 flex-shrink-0"
              value={filter.sourceOperator}
              isDisabled={filter.operatorDisabled || props.readonly}
            />
            <FilterSource filter={filter} onUpdate={props.onUpdate}/>
          </>
        )}

        {/* Filter values */}
        {!isSubFilter && filter.operatorOptions && (
          <>
            <FilterOperator
              options={filter.operatorOptions}
              onChange={onOperatorChange}
              className="mx-2 flex-shrink-0"
              value={filter.operator}
              isDisabled={filter.operatorDisabled || props.readonly}
            />
            {canShowValues && (
              <>
                {props.readonly ? (
                  <div
                    className={'rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip'}
                  >
                    {filter.value.map((val: string) => {
                      return filter.options && filter.options.length
                        ? filter.options[filter.options.findIndex((i: any) => i.value === val)]?.label ?? val
                        : val
                    }).join(', ')}
                  </div>
                ) : (
                  <FilterValue isConditional={isConditional} filter={filter} onUpdate={props.onUpdate}/>
                )}
              </>
            )}
          </>
        )}

        {/* filters */}
        {isSubFilter && (
          <div className="grid grid-col ml-3 w-full">
            {filter.filters
              .filter(
                (i: any) =>
                  (i.key !== FilterKey.FETCH_REQUEST_BODY &&
                    i.key !== FilterKey.FETCH_RESPONSE_BODY) ||
                  saveRequestPayloads
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
      {(props.readonly || props.hideDelete) ? null :
        <div className="flex flex-shrink-0 self-start ml-auto">
          <Button
            disabled={disableDelete}
            variant="text"
            icon="trash"
            onClick={props.onRemoveFilter}
            size="small"
            iconSize={14}
          />
        </div>
      }
    </div>
  );
}

export default FilterItem;
