import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Button, Space, Typography, Tooltip } from 'antd';
import { FilterKey } from 'App/types/filter/filterType';
import { CircleMinus, FunnelPlus } from 'lucide-react';
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
  parentEventFilterOptions?: Filter[];
  isDragging?: boolean;
  isFirst?: boolean;
}

function FilterItem(props: Props) {
  const {
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
    subFilterIndex = 0, // Default to 0
    propertyOrder,
    onToggleOperator,
    parentEventFilterOptions,
    isDragging,
    isFirst = false // Default to false
  } = props;

  const [eventFilterOptions, setEventFilterOptions] = useState<Filter[]>([]);
  const [eventFiltersLoading, setEventFiltersLoading] = useState(false);

  const { filterStore } = useStore();
  const allFilters = filterStore.getCurrentProjectFilters();
  const eventSelections = allFilters.filter((i) => i.isEvent === filter.isEvent);

  const filterSelections = useMemo(() => {
    if (isSubItem) {
      return parentEventFilterOptions || [];
    }
    return eventSelections;
  }, [isSubItem, parentEventFilterOptions, eventSelections]);

  const operatorOptions = getOperatorsByType(filter.type);

  useEffect(() => {
    async function loadFilters() {
      if (!isSubItem && filter.isEvent && filter.name) {
        try {
          setEventFiltersLoading(true);
          const options = await filterStore.getEventFilters(filter.name);
          setEventFilterOptions(options);
        } catch (error) {
          console.error('Failed to load event filters:', error);
          setEventFilterOptions([]);
        } finally {
          setEventFiltersLoading(false);
        }
      } else {
        if (eventFilterOptions.length > 0) {
          setEventFilterOptions([]);
        }
      }
    }

    void loadFilters();
  }, [filter.name, filter.isEvent, isSubItem, filterStore]);

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
        value: selectedFilter.value || [''],
        filters: selectedFilter.filters
          ? selectedFilter.filters.map((i: any) => ({ ...i, value: [''] }))
          : [],
        operator: selectedFilter.operator // Ensure operator is carried over or reset if needed
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
      const newSubFilter = {
        ...selectedFilter,
        value: selectedFilter.value || [''],
        operator: selectedFilter.operator || getOperatorsByType(selectedFilter.type)[0]?.value // Default operator
      };
      onUpdate({
        ...filter,
        filters: [...(filter.filters || []), newSubFilter]
      });
    },
    [filter, onUpdate]
  );

  const parentShowsIndex = !hideIndex;
  const subFilterMarginLeftClass = parentShowsIndex ? 'ml-[1.75rem]' : 'ml-[0.75rem]';
  const subFilterPaddingLeftClass = parentShowsIndex ? 'pl-11' : 'pl-7';

  const categoryPart = filter?.subCategory ? filter.subCategory : filter?.category;
  const namePart = filter?.displayName || filter?.name;
  const hasCategory = Boolean(categoryPart);
  const hasName = Boolean(namePart);
  const showSeparator = hasCategory && hasName;
  const defaultText = 'Select Filter';

  return (
    <div className={cn('w-full', isDragging ? 'opacity-50' : '')}>
      <div className="flex items-start w-full gap-x-2"> {/* Use items-start */}

        {!isSubItem && !hideIndex && filterIndex !== undefined && filterIndex >= 0 && (
          <div
            className="flex-shrink-0 w-6 h-6 mt-[2px] text-xs flex items-center justify-center rounded-full bg-gray-lightest text-gray-600 font-medium"> {/* Align index top */}
            <span>{filterIndex + 1}</span>
          </div>
        )}

        {isSubItem && (
          <div
            className="flex-shrink-0 w-14 text-right text-sm text-neutral-500/90 pr-2">
            {subFilterIndex === 0 && (
              <Typography.Text className="text-inherit">
                where
              </Typography.Text>
            )}
            {subFilterIndex !== 0 && propertyOrder && onToggleOperator && (
              <Typography.Text
                className={cn(
                  'text-inherit',
                  !readonly && 'cursor-pointer hover:text-main transition-colors'
                )}
                onClick={() =>
                  !readonly && onToggleOperator(propertyOrder === 'and' ? 'or' : 'and')
                }
              >
                {propertyOrder}
              </Typography.Text>
            )}
          </div>
        )}

        {/* Main content area */}
        <div
          className="flex flex-grow flex-wrap gap-x-1 items-center">
          <FilterSelection
            filters={filterSelections}
            onFilterClick={replaceFilter}
            disabled={disableDelete || readonly}
            loading={isSubItem ? false : eventFiltersLoading}
          >
            <Button
              type="default"
              size="small"
              // disabled={isDisabled}
              // onClick={onClick} // Pass onClick handler
              style={{
                maxWidth: '20rem',
                flexShrink: 0
              }}
            >
              <Space size={4} align="center">
                {/* Icon */}
                {filter && (
                  <span className="text-gray-600 flex-shrink-0">
                    {getIconForFilter(filter)}
                    </span>
                )}

                {/* Category/SubCategory */}
                {hasCategory && (
                  <span className="text-neutral-500/90 capitalize text-sm truncate">
                        {categoryPart}
                    </span>
                )}

                {showSeparator && (
                  <span className="text-neutral-400">•</span>
                )}

                <span className="text-sm text-black truncate">
                    {hasName ? namePart : (hasCategory ? '' : defaultText)} {/* Show name or placeholder */}
                </span>
              </Space>
            </Button>
          </FilterSelection>

          {/*<div*/}
          {/*  className={cn(*/}
          {/*    'flex items-center flex-wrap gap-x-2 gap-y-1', // Use baseline inside here*/}
          {/*    isReversed ? 'flex-row-reverse' : 'flex-row'*/}
          {/*  )}*/}
          {/*>*/}
          {filter.hasSource && (
            <>
              <FilterOperator
                options={filter.sourceOperatorOptions}
                onChange={handleSourceOperatorChange}
                value={filter.sourceOperator}
                isDisabled={filter.operatorDisabled || readonly}
                name="operator"
              />
              <FilterSource filter={filter} onUpdate={onUpdate} />
            </>
          )}

          {operatorOptions.length > 0 && filter.type && (
            <>
              <FilterOperator
                options={operatorOptions}
                onChange={handleOperatorChange}
                value={filter.operator}
                isDisabled={filter.operatorDisabled || readonly}
                name="operator"
              />
              {canShowValues &&
                (readonly ? (
                  <div
                    className="rounded bg-gray-lightest text-gray-dark px-2 py-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis border border-gray-light max-w-xs"
                    title={filter.value.join(', ')}
                  >
                    {filter.value
                      .map((val: string) =>
                        filter.options?.find((i: any) => i.value === val)?.label ?? val
                      )
                      .join(', ')}
                  </div>
                ) : (
                  <div className="inline-flex"> {/* Wrap FilterValue */}
                    <FilterValue isConditional={isConditional} filter={filter} onUpdate={onUpdate} />
                  </div>
                ))}
            </>
          )}

          {filter.isEvent && !isSubItem && (
            <FilterSelection
              filters={eventFilterOptions}
              onFilterClick={addSubFilter}
              disabled={disableDelete || readonly || eventFiltersLoading}
              loading={eventFiltersLoading}
            >
              <Tooltip title="Add filter condition" mouseEnterDelay={1}>
                <Button
                  type="text"
                  icon={<FunnelPlus size={14} className="text-gray-600" />}
                  size="small"
                  className="flex items-center justify-center" // Fixed size button
                />
              </Tooltip>
            </FilterSelection>
          )}
          {/*</div>*/}
        </div>

        {/* Action Buttons */}
        {!readonly && !hideDelete && (
          <div className="flex flex-shrink-0 gap-1 items-center self-start"> {/* Align top */}
            <Tooltip title={isSubItem ? 'Remove filter condition' : 'Remove filter'} mouseEnterDelay={1}>
              <Button
                type="text"
                icon={<CircleMinus size={14} />}
                disabled={disableDelete}
                onClick={onRemoveFilter}
                size="small"
                className="flex items-center justify-center" // Fixed size button
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* Sub-Filter Rendering */}
      {filteredSubFilters.length > 0 && (
        <div
          className={cn(
            'relative w-full mt-3 mb-2 flex flex-col gap-2' // Relative parent for border
          )}
        >
          {/* Dashed line */}
          <div className={cn(
            'absolute top-0 bottom-0 left-1 w-px',
            'border-l border-dashed border-gray-300',
            subFilterMarginLeftClass // Dynamic margin based on parent index visibility
          )} style={{ height: 'calc(100% - 4px)' }} />

          {filteredSubFilters.map((subFilter: any, index: number) => (
            <div
              key={`subfilter-wrapper-${filter.id || filterIndex}-${subFilter.key || index}`}
              className={cn('relative', subFilterPaddingLeftClass)} // Apply padding to the wrapper, keep relative
            >
              <FilterItem
                filter={subFilter}
                subFilterIndex={index}
                onUpdate={(updatedSubFilter) => handleUpdateSubFilter(updatedSubFilter, index)}
                onRemoveFilter={() => handleRemoveSubFilter(index)}
                saveRequestPayloads={saveRequestPayloads}
                disableDelete={disableDelete}
                readonly={readonly}
                hideIndex={true} // Sub-items always hide index
                hideDelete={hideDelete}
                isConditional={isConditional}
                isSubItem={true}
                propertyOrder={filter.propertyOrder || 'and'} // Sub-items use parent's propertyOrder
                onToggleOperator={onToggleOperator} // Pass down the parent's toggle function
                parentEventFilterOptions={isSubItem ? parentEventFilterOptions : eventFilterOptions} // Pass options down
                isFirst={index === 0} // Mark the first sub-filter
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(FilterItem);
