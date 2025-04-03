import cn from 'classnames';
import { ChevronRight, MousePointerClick, Search } from 'lucide-react';
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG'; // Assuming correct path
import { Input, Space, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';

export const getIconForFilter = (filter: Filter) => {
  return <MousePointerClick size={14} className="text-gray-400" />;
};

const groupFiltersByCategory = (filters: Filter[]): Record<string, Filter[]> => {
  if (!filters?.length) return {};
  return filters.reduce((acc, filter) => {
    const categoryKey = filter.category || 'Other';
    const category = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    if (!acc[category]) acc[category] = [];
    acc[category].push(filter);
    return acc;
  }, {} as Record<string, Filter[]>);
};

const getFilteredEntries = (query: string, groupedFilters: Record<string, Filter[]>) => {
  const trimmedQuery = query.trim().toLowerCase();
  if (!groupedFilters || Object.keys(groupedFilters).length === 0) {
    return { matchingCategories: ['All'], matchingFilters: {} };
  }
  const allCategories = Object.keys(groupedFilters);
  if (!trimmedQuery) {
    return { matchingCategories: ['All', ...allCategories], matchingFilters: groupedFilters };
  }
  const matchingCategories = new Set<string>(['All']);
  const matchingFilters: Record<string, Filter[]> = {};
  Object.entries(groupedFilters).forEach(([categoryName, categoryFilters]) => {
    const categoryMatch = categoryName.toLowerCase().includes(trimmedQuery);
    let categoryHasMatchingFilters = false;
    const filteredItems = categoryFilters.filter(
      (filter: Filter) =>
        filter.displayName?.toLowerCase().includes(trimmedQuery) ||
        filter.name?.toLowerCase().includes(trimmedQuery)
    );
    if (filteredItems.length > 0) {
      matchingFilters[categoryName] = filteredItems;
      categoryHasMatchingFilters = true;
    }
    if (categoryMatch || categoryHasMatchingFilters) {
      matchingCategories.add(categoryName);
      if (categoryMatch && !categoryHasMatchingFilters) {
        matchingFilters[categoryName] = categoryFilters;
      }
    }
  });
  const sortedMatchingCategories = ['All', ...allCategories.filter(cat => matchingCategories.has(cat))];
  return { matchingCategories: sortedMatchingCategories, matchingFilters };
};


const useDebounce = (value: any, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// --- Sub-Components ---
const FilterItem = React.memo(({ filter, onClick, showCategory }: {
  filter: Filter;
  onClick: (filter: Filter) => void;
  showCategory?: boolean;
}) => (
  <div
    className="flex items-center p-2 cursor-pointer gap-2 rounded-lg hover:bg-active-blue/10 text-sm"
    onClick={() => onClick(filter)}
    role="button" tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onClick(filter);
    }}
  >
    {showCategory && filter.category && (
      <div style={{ width: 110 }}
           className="text-neutral-500 flex items-center justify-between flex-shrink-0 mr-1 text-xs">
        <Typography.Text ellipsis={{ tooltip: true }}
                         className="capitalize flex-1 text-gray-600">{filter.subCategory || filter.category}</Typography.Text>
        <ChevronRight size={14} className="ml-1 text-gray-400" />
      </div>
    )}
    <Space className="flex-grow min-w-0 items-center">
      <span className="text-neutral-500/90 text-xs flex items-center">{getIconForFilter(filter)}</span>
      <Typography.Text ellipsis={{ tooltip: filter.displayName || filter.name }}
                       className="flex-1">{filter.displayName || filter.name}</Typography.Text>
    </Space>
  </div>
));

const CategoryList = React.memo(({ categories, activeCategory, onSelect }: {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    {categories.map((key) => (
      <div
        key={key}
        onClick={() => onSelect(key)}
        className={cn('rounded px-3 py-1.5 hover:bg-active-blue/10 capitalize cursor-pointer font-medium text-sm truncate', key === activeCategory && 'bg-active-blue/10 text-teal font-semibold')}
        title={key} role="button" tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(key);
        }}
      >{key}</div>
    ))}
  </div>
));

function FilterModal({ onFilterClick = () => null, filters = [] }: {
  onFilterClick: (filter: Filter) => void;
  filters: Filter[];
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);
  const [category, setCategory] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const groupedFilters = useMemo(() => groupFiltersByCategory(filters), [filters]);
  const {
    matchingCategories,
    matchingFilters
  } = useMemo(() => getFilteredEntries(debouncedQuery, groupedFilters), [debouncedQuery, groupedFilters]);
  const displayedFilters = useMemo(() => {
    if (category === 'All') {
      return matchingCategories.filter(cat => cat !== 'All').flatMap(cat => (matchingFilters[cat] || []).map(filter => ({
        ...filter,
        category: cat
      })));
    }
    return matchingFilters[category] || [];
  }, [category, matchingFilters, matchingCategories]);
  const isResultEmpty = useMemo(() => matchingCategories.length <= 1 && Object.keys(matchingFilters).length === 0, [matchingCategories, matchingFilters]);

  const handleFilterClick = useCallback((filter: Filter) => {
    onFilterClick(filter);
  }, [onFilterClick]);
  const handleCategoryClick = useCallback((cat: string) => {
    setCategory(cat);
  }, []);

  return (
    <div className="w-[490px] max-h-[380px] grid grid-rows-[auto_1fr] overflow-hidden bg-white">

      <div className="">
        <Input
          ref={inputRef} placeholder={t('Search')} value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus allowClear
          prefix={<Search size={16} className="text-gray-400 mr-1" />}
          className="mb-3 rounded-lg"
        />
      </div>

      <div className="overflow-hidden min-h-0">
        {isResultEmpty ? (
          <div className="h-full flex items-center flex-col justify-center text-center">
            <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={30} />
            <div className="font-medium mt-4 text-neutral-600">{t('No results found')}</div>
            <Typography.Text type="secondary" className="text-sm">{t('Try different keywords')}</Typography.Text>
          </div>
        ) : (
          <div className="flex gap-2 h-full">

            <div className="w-36 flex-shrink-0 border-r border-gray-200 pr-2 h-full overflow-y-auto">
              <CategoryList
                categories={matchingCategories}
                activeCategory={category}
                onSelect={handleCategoryClick}
              />
            </div>

            <div className="flex-grow min-w-0 h-full overflow-y-auto">
              <div className="flex flex-col gap-0.5">
                {displayedFilters.length > 0 ? (
                  displayedFilters.map((filter: Filter) => (
                    <FilterItem
                      key={filter.id || filter.name}
                      filter={filter}
                      onClick={handleFilterClick}
                      showCategory={true} // TODO: Show category based condition
                    />
                  ))
                ) : (
                  category !== 'All' && (
                    <div className="flex items-center justify-center h-full text-neutral-500 text-sm p-4 text-center">
                      {t('No filters in category', { categoryName: category })}
                    </div>
                  )
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(observer(FilterModal));
