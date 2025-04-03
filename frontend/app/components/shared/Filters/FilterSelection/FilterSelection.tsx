import React, { useState, useCallback } from 'react';
import { Popover } from 'antd';
import { observer } from 'mobx-react-lite';
import FilterModal from '../FilterModal/FilterModal';
import { Filter } from '@/mstore/types/filterConstants';
import { trackerInstance } from '@/init/openreplay';

interface FilterSelectionProps {
  filters: Filter[];
  onFilterClick: (filter: Filter) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  isLive?: boolean;
}

const FilterSelection: React.FC<FilterSelectionProps> = observer(({
                                                                    filters,
                                                                    onFilterClick,
                                                                    children,
                                                                    disabled = false,
                                                                    isLive
                                                                  }) => {
  const [open, setOpen] = useState(false);

  const handleFilterClick = useCallback((selectedFilter: Filter) => {
    const mode = selectedFilter.isEvent ? 'event' : 'filter'
    trackerInstance.event(`${mode}_dropdown`, {
      selected_category: selectedFilter.category,
      selected_item: selectedFilter.key,
    });
    onFilterClick(selectedFilter);
    setOpen(false);
  }, [onFilterClick]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!disabled) {
      setOpen(newOpen);
    }
  }, [disabled]);

  const content = (
    <FilterModal
      onFilterClick={handleFilterClick}
      filters={filters}
    />
  );

  const triggerElement = React.isValidElement(children)
    ? React.cloneElement(children, { disabled })
    : children;

  return (
    <div className="relative flex-shrink-0">
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
        overlayClassName="filter-selection-popover rounded-lg border border-gray-200 shadow-sm shadow-gray-200"
        destroyTooltipOnHide
        arrow={false}
      >
        {triggerElement}
      </Popover>
    </div>
  );
});

export default FilterSelection;
