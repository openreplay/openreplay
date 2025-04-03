import { GripVertical } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import FilterItem from '../FilterItem';
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
  const {
    filters,
    handleRemove,
    handleUpdate,
    handleMove,
    isDraggable = false,
    showIndices = true,
    readonly = false,
    isConditional = false,
    saveRequestPayloads = false,
    supportsEmpty = true,
    style,
    className
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
    (hoverIndex: number, hoverPosition: string) => {
      // Calculate the target *visual* position
      // If hovering top half, target index is hoverIndex.
      // If bottom half, target index is hoverIndex + 1.
      return hoverPosition === 'bottom' ? hoverIndex + 1 : hoverIndex;
    },
    []
  );

  const handleDragStart = useCallback(
    (ev: React.DragEvent, index: number, elId: string) => {
      ev.dataTransfer.setData('text/plain', index.toString());
      setDraggedItem(index);
      const el = document.getElementById(elId);
      if (el) {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.width = el.offsetWidth + 'px';
        clone.style.height = 'auto';
        clone.style.opacity = '0.7';
        clone.style.backgroundColor = 'white';
        clone.style.padding = '0.5rem';
        clone.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; // Add shadow
        document.body.appendChild(clone);
        ev.dataTransfer.setDragImage(clone, 20, 20);
        setTimeout(() => document.body.removeChild(clone), 0);
      }
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent, i: number) => {
    event.preventDefault();
    // Prevent re-calculating hover position if already hovering over the same item
    if (hoveredItem.i === i) return;

    const target = event.currentTarget.getBoundingClientRect();
    const hoverMiddleY = (target.bottom - target.top) / 2;
    const hoverClientY = event.clientY - target.top;
    const position = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
    setHoveredItem({ position, i });
  }, [hoveredItem.i]); // Depend on hoveredItem.i to avoid unnecessary updates


  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const draggedIndexStr = event.dataTransfer.getData('text/plain');
      const dragInd = parseInt(draggedIndexStr, 10);

      if (isNaN(dragInd) || hoveredItem.i === null) {
        setHoveredItem({ i: null, position: null });
        setDraggedItem(null);
        return;
      }

      const hoverIndex = hoveredItem.i;
      const hoverPosition = hoveredItem.position || 'bottom';

      let newPosition = calculateNewPosition(hoverIndex, hoverPosition);

      // Important: Adjust newPosition if dragging downwards past the original position
      // because the removal shifts subsequent indices up.
      if (dragInd < newPosition) {
        newPosition--;
      }

      // Only call move if the position actually changed
      if (dragInd !== newPosition && !(dragInd === hoverIndex && hoverPosition === 'top') && !(dragInd === hoverIndex - 1 && hoverPosition === 'bottom')) {
        handleMove(dragInd, newPosition);
      }

      setHoveredItem({ i: null, position: null });
      setDraggedItem(null);
    },
    [handleMove, hoveredItem.i, hoveredItem.position, calculateNewPosition]
  );


  const handleDragEnd = useCallback(() => {
    setHoveredItem({ i: null, position: null });
    setDraggedItem(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    // Only clear if leaving the specific item, not just moving within it
    setHoveredItem({ i: null, position: null });
  }, []);

  return filters.length ? (
    <div className={cn('flex flex-col', className)} style={style}>
      {filters.map((filterItem: any, filterIndex: number) => (
        <div
          key={`filter-${filterItem.key || filterIndex}`}
          className={cn('flex gap-2 items-start hover:bg-active-blue/5 -mx-5 px-5 pe-3 transition-colors duration-100 relative', { // Lighter hover, keep relative
            'opacity-50': draggedInd === filterIndex,
            // Add top/bottom borders based on hover state for visual feedback
            'border-t-2 border-dashed border-teal': hoveredItem.i === filterIndex && hoveredItem.position === 'top',
            'border-b-2 border-dashed border-teal': hoveredItem.i === filterIndex && hoveredItem.position === 'bottom',
            // Add negative margin to compensate for border height only when border is visible
            '-mt-0.5': hoveredItem.i === filterIndex && hoveredItem.position === 'top',
            '-mb-0.5': hoveredItem.i === filterIndex && hoveredItem.position === 'bottom'
          })}
          id={`filter-${filterItem.key || filterIndex}`}
          draggable={isDraggable && filters.length > 1} // Only draggable if enabled and more than one item
          onDragStart={isDraggable && filters.length > 1 ? (e) => handleDragStart(e, filterIndex, `filter-${filterItem.key || filterIndex}`) : undefined}
          onDragEnd={isDraggable ? handleDragEnd : undefined}
          onDragOver={isDraggable ? (e) => handleDragOver(e, filterIndex) : undefined}
          onDrop={isDraggable ? handleDrop : undefined}
          onDragLeave={isDraggable ? handleDragLeave : undefined} // Clear hover effect when leaving
        >
          {isDraggable && filters.length > 1 && (
            <div
              className="cursor-grab text-neutral-500 hover:text-neutral-700 pt-[10px] flex-shrink-0" // Align handle visually
              // Draggable is set on parent div
              style={{ cursor: draggedInd !== null ? 'grabbing' : 'grab' }}
              title="Drag to reorder"
            >
              <GripVertical size={16} />
            </div>
          )}

          {!isDraggable && showIndices &&
            <div className="w-4 flex-shrink-0" />} {/* Placeholder for alignment if not draggable but indices shown */}
          {!isDraggable && !showIndices &&
            <div className="w-4 flex-shrink-0" />} {/* Placeholder for alignment if not draggable and no indices */}


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
            isDragging={draggedInd === filterIndex}
            // Pass down if this is the first item for potential styling (e.g., no 'and'/'or' toggle)
            isFirst={filterIndex === 0}
          />
        </div>
      ))}
    </div>
  ) : null;
};

export default UnifiedFilterList;
