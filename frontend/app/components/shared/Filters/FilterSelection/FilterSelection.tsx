import React, { useState, useCallback, useMemo } from 'react';
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
  isLive?: boolean;
  loading?: boolean;
}

const FilterSelection: React.FC<FilterSelectionProps> = observer(
  ({
    filters,
    onFilterClick,
    children,
    disabled = false,
    isLive,
    loading = false, // <-- Initialize loading prop
  }) => {
    const [open, setOpen] = useState(false);

    const handleFilterClick = useCallback(
      (selectedFilter: Filter) => {
        if (loading) return;
        const mode = selectedFilter.isEvent ? 'event' : 'filter'
    trackerInstance.event(`${mode}_dropdown`, {
      selected_category: selectedFilter.category,
      selected_item: selectedFilter.name,
    });onFilterClick(selectedFilter);
        setOpen(false);
      },
      [onFilterClick, loading],
    );

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        if (!disabled && !loading) {
          setOpen(newOpen);
        } else if (!newOpen) {
          setOpen(newOpen);
        }
      },
      [disabled, loading],
    );

    // const content = loading ? (
    //   <div
    //     className="p-4 flex justify-center items-center"
    //     style={{ minHeight: '100px', minWidth: '150px' }}
    //   >
    //     <Spin />
    //   </div>
    // ) : (
    //   <FilterModal onFilterClick={handleFilterClick} filters={filters} />
    // );

    const content = useMemo(
      () =>
        loading ? (
          <div
            className="p-4 flex justify-center items-center"
            style={{ minHeight: '100px', minWidth: '150px' }}
          >
            <Spin />
          </div>
        ) : (
          <FilterModal onFilterClick={handleFilterClick} filters={filters} />
        ),
      [loading, filters, handleFilterClick],
    );

    const isDisabled = disabled || loading;

    const triggerElement = React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<any>, {
          disabled: isDisabled,
          className: cn(children.props.className, {
            'opacity-70 cursor-not-allowed': loading,
          }), // Example styling
        })
      : children;

    return (
      // <div className={cn('relative flex-shrink-0')}>
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
        // Consistent styling class name with your original
        overlayClassName="filter-selection-popover rounded-lg border border-gray-200 shadow-sm shadow-gray-200 overflow-hidden"
        destroyOnHidden={true}
        arrow={false}
      >
        {triggerElement}
      </Popover>
      // </div>
    );
  },
);

export default FilterSelection;
