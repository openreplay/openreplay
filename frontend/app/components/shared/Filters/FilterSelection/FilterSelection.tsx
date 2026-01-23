import React, { useState, useCallback, useMemo } from 'react';
import { Popover, Spin } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import FilterModal from '../FilterModal/FilterModal';
import { Filter } from '@/mstore/types/filterConstants';
import { trackerInstance } from '@/init/openreplay';
import { mobileScreen } from 'App/utils/isMobile';

interface FilterSelectionProps {
  filters: Filter[];
  activeFilters?: string[];
  onFilterClick: (filter: Filter) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: 'Events' | 'Filters' | 'Properties';
}

const FilterSelection: React.FC<FilterSelectionProps> = observer(
  ({
    filters,
    onFilterClick,
    children,
    disabled = false,
    loading = false,
    activeFilters,
    type,
  }) => {
    const [open, setOpen] = useState(false);

    React.useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => {
        window.removeEventListener('keydown', handler);
      };
    }, []);

    const handleFilterClick = useCallback(
      (selectedFilter: Filter) => {
        if (loading) return;
        const mode = selectedFilter.isEvent ? 'event' : 'filter';
        trackerInstance.event(`${mode}_dropdown`, {
          selected_category: selectedFilter.category,
          selected_item: selectedFilter.name,
        });
        onFilterClick(selectedFilter);
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
          <FilterModal
            activeFilters={activeFilters}
            onFilterClick={handleFilterClick}
            filters={filters}
            type={type}
          />
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
      // <div className={cn('relative shrink-0')}>
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement={mobileScreen ? 'bottom' : 'bottomLeft'}
        classNames={{
          root: 'filter-selection-popover rounded-lg border border-gray-200 shadow-xs shadow-gray-200 overflow-hidden',
        }}
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
