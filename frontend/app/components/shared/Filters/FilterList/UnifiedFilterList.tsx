import { GripVertical } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import FilterItem from '../FilterItem';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';

interface UnifiedFilterListProps {
  title: string;
  filters: any[];
  header?: React.ReactNode;
  filterSelection?: React.ReactNode;
  handleRemove: (key: string) => void;
  handleUpdate: (key: string, updatedFilter: any) => void;
  handleAdd: (newFilter: Filter) => void;
  handleMove: (draggedIndex: number, newPosition: number) => void;
  isDraggable?: boolean;
  showIndices?: boolean;
  readonly?: boolean;
  isConditional?: boolean;
  showEventsOrder?: boolean;
  saveRequestPayloads?: boolean;
  supportsEmpty?: boolean;
  mergeDown?: boolean;
  mergeUp?: boolean;
  borderless?: boolean;
  className?: string;
  style?: React.CSSProperties;
  actions?: React.ReactNode[];
  orderProps?: any;
}

const UnifiedFilterList = (props: UnifiedFilterListProps) => {
  const { t } = useTranslation();
  const {
    filters,
    handleRemove,
    handleUpdate,
    handleMove,
    isDraggable = false,
    showIndices = true,
    readonly = false,
    isConditional = false,
    showEventsOrder = false,
    saveRequestPayloads = false,
    supportsEmpty = true,
    mergeDown = false,
    mergeUp = false,
    style
  } = props;

  const [hoveredItem, setHoveredItem] = useState<{ i: number | null; position: string | null }>({
    i: null,
    position: null
  });
  const [draggedInd, setDraggedItem] = useState<number | null>(null);

  const cannotDelete = !supportsEmpty && filters.length <= 1;

  const updateFilter = useCallback((key: string, updatedFilter: any) => {
    handleUpdate(key, updatedFilter);
  }, [handleUpdate]);

  const removeFilter = useCallback((key: string) => {
    handleRemove(key);
  }, [handleRemove]);

  const calculateNewPosition = useCallback(
    (dragInd: number, hoverIndex: number, hoverPosition: string) => {
      return hoverPosition === 'bottom' ? (dragInd < hoverIndex ? hoverIndex - 1 : hoverIndex) : hoverIndex;
    },
    []
  );

  const handleDragStart = useCallback(
    (ev: React.DragEvent, index: number, elId: string) => {
      ev.dataTransfer.setData('text/plain', index.toString());
      setDraggedItem(index);
      const el = document.getElementById(elId);
      if (el) {
        ev.dataTransfer.setDragImage(el, 0, 0);
      }
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent, i: number) => {
    event.preventDefault();
    const target = event.currentTarget.getBoundingClientRect();
    const hoverMiddleY = (target.bottom - target.top) / 2;
    const hoverClientY = event.clientY - target.top;
    const position = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
    setHoveredItem({ position, i });
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (draggedInd === null || hoveredItem.i === null) return;
      const newPosition = calculateNewPosition(
        draggedInd,
        hoveredItem.i,
        hoveredItem.position || 'bottom'
      );
      handleMove(draggedInd, newPosition);
      setHoveredItem({ i: null, position: null });
      setDraggedItem(null);
    },
    [draggedInd, calculateNewPosition, handleMove, hoveredItem.i, hoveredItem.position]
  );

  const handleDragEnd = useCallback(() => {
    setHoveredItem({ i: null, position: null });
    setDraggedItem(null);
  }, []);

  return (
    <div className="flex flex-col" style={style}>
      {filters.map((filterItem: any, filterIndex: number) => (
        <div
          key={`filter-${filterIndex}`}
          className={cn('hover:bg-active-blue px-5 pe-3 gap-2 items-center flex', {
            'bg-[#f6f6f6]': hoveredItem.i === filterIndex
          })}
          style={{
            marginLeft: '-1rem',
            width: 'calc(100% + 2rem)',
            alignItems: 'start',
            borderTop: hoveredItem.i === filterIndex && hoveredItem.position === 'top' ? '1px dashed #888' : undefined,
            borderBottom: hoveredItem.i === filterIndex && hoveredItem.position === 'bottom' ? '1px dashed #888' : undefined
          }}
          id={`filter-${filterItem.key}`}
          onDragOver={isDraggable ? (e) => handleDragOver(e, filterIndex) : undefined}
          onDrop={isDraggable ? handleDrop : undefined}
        >
          {isDraggable && filters.length > 1 && (
            <div
              className="cursor-grab text-neutral-500/90 hover:bg-white px-1 mt-2.5 rounded-lg"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, filterIndex, `filter-${filterIndex}`)}
              onDragEnd={handleDragEnd}
              style={{ cursor: draggedInd !== null ? 'grabbing' : 'grab' }}
            >
              <GripVertical size={16} />
            </div>
          )}

          <FilterItem
            filterIndex={showIndices ? filterIndex : undefined}
            filter={filterItem}
            onUpdate={(updatedFilter) => updateFilter(filterItem.key, updatedFilter)}
            onRemoveFilter={() => removeFilter(filterItem.key)}
            saveRequestPayloads={saveRequestPayloads}
            disableDelete={cannotDelete}
            readonly={readonly}
            isConditional={isConditional}
            hideIndex={!showIndices}
          />
        </div>
      ))}
    </div>
  );
};

export default UnifiedFilterList;
