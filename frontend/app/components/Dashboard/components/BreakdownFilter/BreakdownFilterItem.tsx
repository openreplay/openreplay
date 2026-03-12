import { Filter } from '@/mstore/types/filterConstants';
import { Button, Space } from 'antd';
import cn from 'classnames';
import { CircleMinus, GripVertical } from 'lucide-react';
import React from 'react';

import { getIconForFilter } from 'Shared/Filters/FilterModal';
import FilterSelection from 'Shared/Filters/FilterSelection';

function BreakdownFilterItem({
  filter,
  index,
  onReplaceFilter,
  onRemoveFilter,
  propertyOptions,
  activeFilterNames,
  draggedIdx,
  hoverIdx,
  hoverPos,
  setHoverIdx,
  setHoverPos,
  breakdownFilters,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  filter: Filter;
  index: number;
  onReplaceFilter: (index: number) => (filter: Filter) => void;
  onRemoveFilter: (index: number) => void;
  propertyOptions: Filter[];
  activeFilterNames: string[];
  draggedIdx: number | null;
  hoverIdx: number | null;
  hoverPos: 'top' | 'bottom' | null;
  setHoverIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setHoverPos: React.Dispatch<React.SetStateAction<'top' | 'bottom' | null>>;
  breakdownFilters: Filter[];
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const categoryPart = filter?.subCategory
    ? filter.subCategory
    : filter?.category;
  const namePart = filter?.displayName || filter?.name;
  const hasCategory = Boolean(categoryPart);
  const hasName = Boolean(namePart);
  const showSeparator = hasCategory && hasName;
  const isDraggable = breakdownFilters.length > 1;

  return (
    <div
      key={`${filter.name}_${index}`}
      className={cn('flex items-center gap-1 py-1 rounded transition-colors', {
        'opacity-40': draggedIdx === index,
        'border-t-2 border-dashed border-teal -mt-px':
          hoverIdx === index && hoverPos === 'top',
        'border-b-2 border-dashed border-teal -mb-px':
          hoverIdx === index && hoverPos === 'bottom',
      })}
      draggable={isDraggable}
      onDragStart={isDraggable ? (e) => onDragStart(e, index) : undefined}
      onDragOver={isDraggable ? (e) => onDragOver(e, index) : undefined}
      onDrop={isDraggable ? onDrop : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
      onDragLeave={
        isDraggable
          ? () => {
              setHoverIdx(null);
              setHoverPos(null);
            }
          : undefined
      }
    >
      {isDraggable && (
        <div
          className="cursor-grab text-neutral-400 hover:text-neutral-600 shrink-0"
          style={{
            cursor: draggedIdx !== null ? 'grabbing' : 'grab',
          }}
        >
          <GripVertical size={14} />
        </div>
      )}

      <FilterSelection
        filters={propertyOptions}
        activeFilters={activeFilterNames}
        onFilterClick={onReplaceFilter(index)}
        type="Filters"
      >
        <Button
          type="default"
          size="small"
          style={{ maxWidth: '20rem', flexShrink: 0 }}
        >
          <Space size={4} align="center">
            {filter && (
              <span className="text-gray-600 shrink-0">
                {getIconForFilter(filter)}
              </span>
            )}

            {hasCategory && (
              <span className="text-neutral-500/90 capitalize truncate">
                {categoryPart}
              </span>
            )}

            {showSeparator && <span className="text-neutral-400">&bull;</span>}

            <span className="text-black truncate">
              {hasName ? namePart : hasCategory ? '' : 'Select Filter'}
            </span>
          </Space>
        </Button>
      </FilterSelection>

      <Button
        type="text"
        size="small"
        icon={<CircleMinus size={14} />}
        onClick={() => onRemoveFilter(index)}
        className="text-gray-400 hover:text-red-500"
      />
    </div>
  );
}

export default BreakdownFilterItem;
