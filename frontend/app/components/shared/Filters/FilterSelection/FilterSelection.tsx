import React, { useState, useCallback } from 'react';
// Import Spin and potentially classnames
import { Popover, Spin } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import FilterModal from '../FilterModal/FilterModal';
import { Filter } from '@/mstore/types/filterConstants';
import { trackerInstance } from '@/init/openreplay';

interface FilterSelectionProps {
  filters: Filter[];
  onFilterClick: (filter: Filter) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  isLive?: boolean; // This prop seems unused, consider removing if not needed downstream
  loading?: boolean; // <-- Add loading prop
}

const FilterSelection: React.FC<FilterSelectionProps> = observer(({
                                                                    filters,
                                                                    onFilterClick,
                                                                    children,
                                                                    disabled = false,
                                                                    isLive,
                                                                    loading = false // <-- Initialize loading prop
                                                                  }) => {
  const [open, setOpen] = useState(false);

  const handleFilterClick = useCallback((selectedFilter: Filter) => {
    // Don't do anything if loading - though modal shouldn't be clickable then anyway
    if (loading) return;
    const mode = selectedFilter.isEvent ? 'event' : 'filter'
    trackerInstance.event(`${mode}_dropdown`, {
      selected_category: selectedFilter.category,
      selected_item: selectedFilter.name,
    });
    onFilterClick(selectedFilter);
    setOpen(false);
  }, [onFilterClick, loading]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    // Prevent opening if disabled or loading
    if (!disabled && !loading) {
      setOpen(newOpen);
    } else if (!newOpen) {
      // Allow closing even if disabled/loading (e.g., clicking outside)
      setOpen(newOpen);
    }
  }, [disabled, loading]);

  // Determine the content for the Popover
  const content = (
    loading
      // Show a spinner centered in the popover content area while loading
      ? <div className="p-4 flex justify-center items-center" style={{ minHeight: '100px', minWidth: '150px' }}>
        <Spin />
      </div>
      // Otherwise, show the filter modal
      : <FilterModal
        onFilterClick={handleFilterClick}
        filters={filters}
        // If FilterModal needs to know about the live status, pass it down:
        // isLive={isLive}
      />
  );

  // Combine disabled and loading states for the trigger element
  const isDisabled = disabled || loading;

  // Clone the trigger element (children) and pass the effective disabled state
  // Also add loading class for potential styling (e.g., opacity)
  const triggerElement = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
      disabled: isDisabled,
      className: cn(children.props.className, { 'opacity-70 cursor-not-allowed': loading }) // Example styling
    })
    : children;

  return (
    // Add a class to the wrapper if needed, e.g., for opacity when loading
    <div className={cn('relative flex-shrink-0')}>
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
        // Consistent styling class name with your original
        overlayClassName="filter-selection-popover rounded-lg border border-gray-200 shadow-sm shadow-gray-200 overflow-hidden"
        destroyTooltipOnHide
        arrow={false}
      >
        {triggerElement}
      </Popover>
    </div>
  );
});

export default FilterSelection;
