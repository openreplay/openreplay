import React from 'react';
import { Typography, Space } from 'antd';
import cn from 'classnames';
import { ChevronRight } from 'lucide-react';
import { Filter } from '@/mstore/types/filterConstants';
import { getIconForFilter } from './utils';

export const FilterItem = React.memo(
  ({
    filter,
    onClick,
    showCategory,
    disabled = false,
  }: {
    filter: Filter;
    onClick: (f: Filter) => void;
    showCategory?: boolean;
    disabled?: boolean;
  }) => (
    <div
      className={cn(
        'flex items-center p-2 gap-2 rounded-lg text-sm',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blueLight',
      )}
      onClick={() => (disabled ? null : onClick(filter))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(filter);
      }}
    >
      {showCategory && filter.category && (
        <div
          // style={{ width: 110 }}
          className={cn(
            disabled ? 'text-disabled-text' : 'text-neutral-500',
            'flex items-center justify-between flex-shrink-0 mr-1 text-xs',
          )}
        >
          <Typography.Text
            ellipsis={{ tooltip: true }}
            className={cn(
              'capitalize flex-1',
              disabled ? 'text-disabled-text' : 'text-gray-600',
            )}
          >
            {filter.subCategory || filter.category}
          </Typography.Text>
          <ChevronRight size={14} className="ml-1 text-gray-400" />
        </div>
      )}
      <Space className="flex-grow min-w-0 items-center">
        <span
          className={cn(
            'text-xs flex items-center',
            disabled ? 'text-disabled-text' : 'text-neutral-500/90',
          )}
        >
          {getIconForFilter(filter)}
        </span>
        <Typography.Text
          ellipsis={{ tooltip: filter.displayName || filter.name }}
          className={cn('flex-1', disabled ? 'text-disabled-text' : '')}
        >
          {filter.displayName || filter.name}
        </Typography.Text>
      </Space>
    </div>
  ),
);

export const CategoryList = React.memo(
  ({
    categories,
    activeCategory,
    onSelect,
  }: {
    categories: string[];
    activeCategory: string;
    onSelect: (c: string) => void;
  }) => (
    <div className="flex flex-col gap-1">
      {categories.map((key) => (
        <div
          key={key}
          onClick={() => onSelect(key)}
          className={cn(
            'rounded px-3 py-1.5 hover:bg-active-blue/10 capitalize cursor-pointer font-medium text-sm truncate',
            key === activeCategory &&
              'bg-active-blue/10 text-teal font-semibold',
          )}
          title={key}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(key);
          }}
        >
          {key}
        </div>
      ))}
    </div>
  ),
);
