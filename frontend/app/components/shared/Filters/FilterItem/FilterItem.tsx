import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Button, Space, Typography } from 'antd';
import { FilterKey } from 'App/types/filter/filterType';
import { CircleMinus, Filter as FilterIcon } from 'lucide-react';
import cn from 'classnames';
import FilterOperator from '../FilterOperator';
import FilterSelection from '../FilterSelection';
import FilterValue from '../FilterValue';
import FilterSource from '../FilterSource';
import { useStore } from '@/mstore';
import { getIconForFilter } from 'Shared/Filters/FilterModal/FilterModal';
import { Filter, getOperatorsByType } from '@/mstore/types/filterConstants';

interface Props {
  filterIndex?: number;
  filter: any;
  onUpdate: (filter: any) => void;
  onRemoveFilter: () => void;
  isFilter?: boolean;
  saveRequestPayloads?: boolean;
  disableDelete?: boolean;
  readonly?: boolean;
  hideIndex?: boolean;
  hideDelete?: boolean;
  isConditional?: boolean;
  isSubItem?: boolean;
  subFilterIndex?: number;
  propertyOrder?: string;
  onToggleOperator?: (newOp: string) => void;
}

function FilterItem(props: Props) {
  const {
    isFilter = false,
    filterIndex,
    filter,
    saveRequestPayloads,
    disableDelete = false,
    hideDelete = false,
    isConditional,
    hideIndex = false,
    onUpdate,
    onRemoveFilter,
    readonly,
    isSubItem = false,
    subFilterIndex,
    propertyOrder,
    onToggleOperator
  } = props;
  const [eventFilterOptions, setEventFilterOptions] = useState<Filter[]>([]);

  const { filterStore } = useStore();
  const allFilters = filterStore.getCurrentProjectFilters();
  const eventSelections = allFilters.filter((i) => i.isEvent === filter.isEvent);
  const filterSelections = isSubItem ? eventFilterOptions : eventSelections;


  const [eventFiltersLoading, setEventFiltersLoading] = useState(false);
  const operatorOptions = getOperatorsByType(filter.type);


  useEffect(() => {
    async function loadFilters() {
      try {
        setEventFiltersLoading(true);
        const options = await filterStore.getEventFilters(filter.name);
        setEventFilterOptions(options);
      } finally {
        setEventFiltersLoading(false);
      }
    }

    void loadFilters();
  }, [filter.name]); // Re-fetch when filter name changes

  const canShowValues = useMemo(
    () =>
      !(
        filter.operator === 'isAny' ||
        filter.operator === 'onAny' ||
        filter.operator === 'isUndefined'
      ),
    [filter.operator]
  );

  const isReversed = useMemo(() => filter.key === FilterKey.TAGGED_ELEMENT, [filter.key]);

  const replaceFilter = useCallback(
    (selectedFilter: any) => {
      onUpdate({
        ...selectedFilter,
        value: selectedFilter.value,
        filters: selectedFilter.filters
          ? selectedFilter.filters.map((i: any) => ({ ...i, value: [''] }))
          : []
      });
    },
    [onUpdate]
  );

  const handleOperatorChange = useCallback(
    (e: any, { value }: any) => {
      onUpdate({ ...filter, operator: value });
    },
    [filter, onUpdate]
  );

  const handleSourceOperatorChange = useCallback(
    (e: any, { value }: any) => {
      onUpdate({ ...filter, sourceOperator: value });
    },
    [filter, onUpdate]
  );

  const handleUpdateSubFilter = useCallback(
    (subFilter: any, index: number) => {
      onUpdate({
        ...filter,
        filters: filter.filters.map((i: any, idx: number) => (idx === index ? subFilter : i))
      });
    },
    [filter, onUpdate]
  );

  const handleRemoveSubFilter = useCallback(
    (index: number) => {
      onUpdate({
        ...filter,
        filters: filter.filters.filter((_: any, idx: number) => idx !== index)
      });
    },
    [filter, onUpdate]
  );

  const filteredSubFilters = useMemo(
    () =>
      filter.filters
        ? filter.filters.filter(
          (i: any) =>
            (i.key !== FilterKey.FETCH_REQUEST_BODY && i.key !== FilterKey.FETCH_RESPONSE_BODY) ||
            saveRequestPayloads
        )
        : [],
    [filter.filters, saveRequestPayloads]
  );

  const addSubFilter = useCallback(
    (selectedFilter: any) => {
      onUpdate({
        ...filter,
        filters: [...filteredSubFilters, selectedFilter]
      });
    },
    [filter, onUpdate]
  );

  return (
    <div className="w-full">
      <div className="flex items-center w-full">
        <div className="flex items-center flex-grow flex-wrap">
          {!isFilter && !hideIndex && filterIndex !== undefined && filterIndex >= 0 && (
            <div
              className="flex-shrink-0 w-6 h-6 text-xs flex items-center justify-center rounded-full bg-gray-lighter mr-2">
              <span>{filterIndex + 1}</span>
            </div>
          )}

          {isSubItem && (
            <div className="w-14 text-right">
              {subFilterIndex === 0 && (
                <Typography.Text className="text-neutral-500/90 mr-2">
                  where
                </Typography.Text>
              )}
              {subFilterIndex != 0 && propertyOrder && onToggleOperator && (
                <Typography.Text
                  className="text-neutral-500/90 mr-2 cursor-pointer"
                  onClick={() =>
                    onToggleOperator(propertyOrder === 'and' ? 'or' : 'and')
                  }
                >
                  {propertyOrder}
                </Typography.Text>
              )}
            </div>
          )}

          <FilterSelection
            filters={filterSelections}
            onFilterClick={replaceFilter}
            disabled={disableDelete || readonly}
          >
            <Space
              className={cn(
                'rounded-lg py-1 px-2 cursor-pointer bg-white border border-gray-light text-ellipsis hover:border-neutral-400 btn-select-event',
                { 'opacity-50 pointer-events-none': disableDelete || readonly }
              )}
              style={{ height: '26px' }}
            >
              <div className="text-xs">
                {filter && getIconForFilter(filter)}
              </div>
              <div className="text-neutral-500/90 capitalize">
                {`${filter?.subCategory ? filter.subCategory : filter?.category}`}
              </div>
              <span className="text-neutral-500/90">•</span>
              <div
                className="rounded-lg overflow-hidden whitespace-nowrap text-ellipsis mr-auto truncate"
                style={{ textOverflow: 'ellipsis' }}
              >
                {filter.displayName || filter.name}
              </div>
            </Space>

          </FilterSelection>

          <div
            className={cn(
              'flex items-center flex-wrap',
              isReversed ? 'flex-row-reverse ml-2' : 'flex-row'
            )}
          >
            {filter.hasSource && (
              <>
                <FilterOperator
                  options={filter.sourceOperatorOptions}
                  onChange={handleSourceOperatorChange}
                  className="mx-2 flex-shrink-0 btn-event-operator"
                  value={filter.sourceOperator}
                  isDisabled={filter.operatorDisabled || readonly}
                />
                <FilterSource filter={filter} onUpdate={onUpdate} />
              </>
            )}

            {operatorOptions.length && (
              <>
                <FilterOperator
                  options={operatorOptions}
                  onChange={handleOperatorChange}
                  className="mx-2 flex-shrink-0 btn-sub-event-operator"
                  value={filter.operator}
                  isDisabled={filter.operatorDisabled || readonly}
                />
                {canShowValues &&
                  (readonly ? (
                    <div
                      className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip hover:border-neutral-400">
                      {filter.value
                        .map((val: string) =>
                          filter.options && filter.options.length
                            ? filter.options[
                            filter.options.findIndex((i: any) => i.value === val)
                            ]?.label ?? val
                            : val
                        )
                        .join(', ')}
                    </div>
                  ) : (
                    <FilterValue isConditional={isConditional} filter={filter} onUpdate={onUpdate} />
                  ))}
              </>
            )}
          </div>
        </div>

        {!readonly && !hideDelete && (
          <div className="flex flex-shrink-0 gap-2">
            {filter.isEvent && !isSubItem && (
              <FilterSelection
                filters={eventFilterOptions}
                onFilterClick={addSubFilter}
                disabled={disableDelete || readonly}
              >
                <Button
                  type="text"
                  icon={<FilterIcon size={13} />}
                  size="small"
                  aria-label="Add filter"
                  title="Filter"
                />
              </FilterSelection>
            )}

            <Button
              type="text"
              icon={<CircleMinus size={13} />}
              disabled={disableDelete}
              onClick={onRemoveFilter}
              size="small"
              aria-label="Remove filter"
            />
          </div>
        )}
      </div>

      {filter.filters?.length > 0 && (
        <div className="pl-8 w-full">
          {filteredSubFilters.map((subFilter: any, index: number) => (
            <FilterItem
              key={`subfilter-${index}`}
              filter={subFilter}
              subFilterIndex={index}
              onUpdate={(updatedSubFilter) => handleUpdateSubFilter(updatedSubFilter, index)}
              onRemoveFilter={() => handleRemoveSubFilter(index)}
              isFilter={isFilter}
              saveRequestPayloads={saveRequestPayloads}
              disableDelete={disableDelete}
              readonly={readonly}
              hideIndex={hideIndex}
              hideDelete={hideDelete}
              isConditional={isConditional}
              isSubItem={true}
              propertyOrder={filter.propertyOrder || 'and'}
              onToggleOperator={(newOp) =>
                onUpdate({ ...filter, propertyOrder: newOp })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(FilterItem);
