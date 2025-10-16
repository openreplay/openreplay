import cn from 'classnames';
import {
  ALargeSmall,
  ChevronRight,
  Hash,
  MousePointerClick,
  Search,
} from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Input, Space, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';
import { VList } from 'virtua';
import { FilterType } from 'Types/filter/filterType';
import type { ComponentType } from 'react';
import { useStore } from 'App/mstore';

type IconProps = { size: number; className?: string };
type FilterIconMap = Record<FilterType, ComponentType<IconProps>>;

const iconProps: IconProps = { size: 14 };

const PropertyIconMap = {
  [FilterType.NUMBER]: Hash,
  [FilterType.INTEGER]: Hash,
  [FilterType.STRING]: ALargeSmall,
} as unknown as FilterIconMap;

export const getIconForFilter = (filter: Filter): React.ReactNode => {
  const Icon = filter.isEvent
    ? MousePointerClick
    : (filter.dataType && filter.dataType in PropertyIconMap
        ? PropertyIconMap[filter.dataType as FilterType]
        : null) || ALargeSmall;
  const className = filter.isEvent ? 'text-gray-400' : undefined;
  return <Icon {...iconProps} className={className} />;
};

const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    auto_captured: 'Auto Captured',
    user_events: 'User Events',
  };

  if (categoryMap[category]) {
    return categoryMap[category];
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
};

const groupFiltersByCategory = (
  filters: Filter[],
): Record<string, Filter[]> => {
  if (!filters?.length) return {};
  return filters.reduce(
    (acc, filter) => {
      const key = filter.category || 'Other';
      const cat = getCategoryDisplayName(key);
      (acc[cat] ||= []).push(filter);
      return acc;
    },
    {} as Record<string, Filter[]>,
  );
};

const getFilteredEntries = (
  query: string,
  grouped: Record<string, Filter[]>,
) => {
  const trimmed = query.trim().toLowerCase();
  if (!Object.keys(grouped).length)
    return { matchingCategories: ['All'], matchingFilters: {} };
  const categories = Object.keys(grouped);
  if (!trimmed)
    return {
      matchingCategories: ['All', ...categories],
      matchingFilters: grouped,
    };
  const matched = new Set<string>(['All']);
  const filtersMap: Record<string, Filter[]> = {};

  categories.forEach((cat) => {
    const catMatch = cat.toLowerCase().includes(trimmed);
    const items = grouped[cat].filter(
      (f) =>
        f.displayName?.toLowerCase().includes(trimmed) ||
        f.name?.toLowerCase().includes(trimmed),
    );
    if (items.length) filtersMap[cat] = items;
    if (catMatch) filtersMap[cat] ||= grouped[cat];
    if (catMatch || items.length) matched.add(cat);
  });

  return {
    matchingCategories: ['All', ...categories.filter((c) => matched.has(c))],
    matchingFilters: filtersMap,
  };
};

const useDebounce = (value: any, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
};

const FilterItem = React.memo(
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

const CategoryList = React.memo(
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

function FilterModal({
  onFilterClick = () => null,
  filters = [],
  activeFilters = [],
}: {
  onFilterClick: (f: Filter) => void;
  filters: Filter[];
  activeFilters?: string[];
}) {
  const inputRef = React.useRef(null);
  const { filterStore } = useStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);
  const [category, setCategory] = useState('All');
  const groupedFilters = useMemo(
    () => groupFiltersByCategory(filters),
    [filters],
  );
  const { matchingCategories, matchingFilters } = useMemo(
    () => getFilteredEntries(debouncedQuery, groupedFilters),
    [debouncedQuery, groupedFilters],
  );
  const displayedFilters = useMemo(() => {
    if (category === 'All') {
      return matchingCategories
        .filter((cat) => cat !== 'All')
        .flatMap((cat) =>
          (matchingFilters[cat] || []).map((filter) => ({
            ...filter,
            category: cat,
          })),
        );
    }
    return matchingFilters[category] || [];
  }, [category, matchingFilters, matchingCategories]);
  const isResultEmpty = useMemo(
    () =>
      matchingCategories.length <= 1 &&
      Object.keys(matchingFilters).length === 0,
    [matchingCategories, matchingFilters],
  );

  const handleFilterClick = useCallback(
    (filter: Filter) => {
      if (filter.subCategory?.startsWith('issue')) {
        const filters = filterStore.getCurrentProjectFilters();
        const issueTypeFilter = filters.find((f) => f.name === 'issue_type');
        if (issueTypeFilter) {
          const newVal = filter.name;
          filter = { ...issueTypeFilter, value: [newVal] };
        }
      }
      onFilterClick(filter);
    },
    [onFilterClick],
  );
  const handleCategoryClick = useCallback((cat: string) => {
    setCategory(cat);
  }, []);

  React.useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        (inputRef.current as any).focus();
      }
    }, 0);
  }, []);

  return (
    <div className="w-[90vw] mx-[2vw] md:mx-0 md:w-[490px] max-h-[380px] grid grid-rows-[auto_1fr] overflow-hidden bg-white">
      <div>
        <Input
          ref={inputRef}
          placeholder={t('Search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          allowClear
          prefix={<Search size={16} className="text-gray-400 mr-1" />}
          className="mb-3 rounded-lg"
        />
      </div>

      <div className="overflow-hidden min-h-0">
        {isResultEmpty ? (
          <div className="h-full flex items-center flex-col justify-center text-center">
            <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={30} />
            <div className="font-medium mt-4 text-neutral-600">
              {t('No results found')}
            </div>
            <Typography.Text type="secondary" className="text-sm">
              {t('Try different keywords')}
            </Typography.Text>
          </div>
        ) : (
          <div className="flex gap-2 h-full">
            <div className="w-24 md:w-36 flex-shrink-0 border-r border-gray-200 pr-2 h-full overflow-y-auto">
              <CategoryList
                categories={matchingCategories}
                activeCategory={category}
                onSelect={handleCategoryClick}
              />
            </div>
            <div className="flex-grow min-w-0 h-full">
              <VList style={{ height: 300 }}>
                {displayedFilters.map((filter, i) => (
                  <FilterItem
                    key={filter.id || filter.name}
                    filter={filter}
                    disabled={
                      !filter.isEvent && activeFilters?.includes(filter.name)
                    }
                    onClick={handleFilterClick}
                    showCategory
                  />
                ))}
              </VList>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(observer(FilterModal));
