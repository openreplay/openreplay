import cn from 'classnames';
import { Pointer, ChevronRight, MousePointerClick } from 'lucide-react';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Input, Space, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';

export const getIconForFilter = (filter: Filter) => <MousePointerClick size={14} />;

// Helper function for grouping filters
const groupFiltersByCategory = (filters: Filter[]) => {
  if (!filters?.length) return {};

  return filters.reduce((acc, filter) => {
    const category = filter.category
      ? filter.category.charAt(0).toUpperCase() + filter.category.slice(1)
      : 'Unknown';

    if (!acc[category]) acc[category] = [];
    acc[category].push(filter);
    return acc;
  }, {});
};

// Optimized filtering function with early returns
const getFilteredEntries = (query: string, filters: Filter[]) => {
  const trimmedQuery = query.trim().toLowerCase();

  if (!filters || Object.keys(filters).length === 0) {
    return { matchingCategories: ['All'], matchingFilters: {} };
  }

  if (!trimmedQuery) {
    return {
      matchingCategories: ['All', ...Object.keys(filters)],
      matchingFilters: filters
    };
  }

  const matchingCategories = ['All'];
  const matchingFilters = {};

  // Single pass through the data with optimized conditionals
  Object.entries(filters).forEach(([name, categoryFilters]) => {
    const categoryMatch = name.toLowerCase().includes(trimmedQuery);

    if (categoryMatch) {
      matchingCategories.push(name);
      matchingFilters[name] = categoryFilters;
      return;
    }

    const filtered = categoryFilters.filter(
      (filter: Filter) =>
        filter.displayName?.toLowerCase().includes(trimmedQuery) ||
        filter.name?.toLowerCase().includes(trimmedQuery)
    );

    if (filtered.length) {
      matchingCategories.push(name);
      matchingFilters[name] = filtered;
    }
  });

  return { matchingCategories, matchingFilters };
};

// Custom debounce hook to optimize search
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

// Memoized filter item component
const FilterItem = React.memo(({ filter, onClick, showCategory }: {
  filter: Filter;
  onClick: (filter: Filter) => void;
  showCategory?: boolean;
}) => (
  <div
    className="flex items-center flex-shrink-0 p-2 cursor-pointer gap-1 rounded-lg hover:bg-active-blue"
    onClick={() => onClick(filter)}
  >
    {showCategory && filter.category && (
      <div style={{ width: 100 }} className="text-neutral-500/90 flex justify-between items-center">
        <span className="capitalize">{filter.subCategory || filter.category}</span>
        <ChevronRight size={14} />
      </div>
    )}
    <Space className="flex-1 min-w-0">
      <span className="text-neutral-500/90 text-xs">{getIconForFilter(filter)}</span>
      <Typography.Text
        ellipsis={{ tooltip: true }}
        className="max-w-full"
        style={{ display: 'block' }}
      >
        {filter.displayName || filter.name}
      </Typography.Text>
    </Space>
  </div>
));

// Memoized category list component
const CategoryList = React.memo(({ categories, activeCategory, onSelect }: {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}) => (
  <>
    {categories.map((key) => (
      <div
        key={key}
        onClick={() => onSelect(key)}
        className={cn(
          'rounded-xl px-4 py-2 hover:bg-active-blue capitalize cursor-pointer font-medium',
          key === activeCategory && 'bg-active-blue text-teal'
        )}
      >
        {key}
      </div>
    ))}
  </>
));

function FilterModal({ onFilterClick = () => null, filters = [], isMainSearch = false }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);
  const [category, setCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  // Memoize expensive computations
  const groupedFilters = useMemo(() =>
      groupFiltersByCategory(filters),
    [filters]
  );

  const { matchingCategories, matchingFilters } = useMemo(
    () => getFilteredEntries(debouncedQuery, groupedFilters),
    [debouncedQuery, groupedFilters]
  );

  const displayedFilters = useMemo(() => {
    if (category === 'All') {
      return Object.entries(matchingFilters).flatMap(([cat, filters]) =>
        filters.map((filter) => ({ ...filter, category: cat }))
      );
    }
    return matchingFilters[category] || [];
  }, [category, matchingFilters]);

  const isResultEmpty = useMemo(
    () => matchingCategories.length <= 1 && Object.keys(matchingFilters).length === 0,
    [matchingCategories.length, matchingFilters]
  );

  // Memoize handlers
  const handleFilterClick = useCallback(
    (filter: Filter) => onFilterClick({ ...filter, operator: 'is' }),
    [onFilterClick]
  );

  const handleCategoryClick = useCallback(
    (cat: string) => setCategory(cat),
    []
  );

  // Focus input only when necessary
  useEffect(() => {
    inputRef.current?.focus();
  }, [category]);

  if (isLoading) {
    return (
      <div style={{ width: '490px', maxHeight: '380px' }}>
        <div className="flex items-center justify-center h-60">
          <Loader loading />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '490px', maxHeight: '380px' }}>
      <Input
        ref={inputRef}
        className="mb-4 rounded-xl text-lg font-medium placeholder:text-lg placeholder:font-medium placeholder:text-neutral-300"
        placeholder="Search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />

      {isResultEmpty ? (
        <div className="flex items-center flex-col justify-center h-60">
          <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={30} />
          <div className="font-medium px-3 mt-4">{t('No matching filters.')}</div>
        </div>
      ) : (
        <div className="flex gap-2 items-start">
          <div className="flex flex-col gap-1 min-w-40">
            <CategoryList
              categories={matchingCategories}
              activeCategory={category}
              onSelect={handleCategoryClick}
            />
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto w-full" style={{ maxHeight: 300, flex: 2 }}>
            {displayedFilters.length > 0 ? (
              displayedFilters.map((filter: Filter, index: number) => (
                <FilterItem
                  key={`${filter.name}-${index}`}
                  filter={filter}
                  onClick={handleFilterClick}
                  showCategory={category === 'All'}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-neutral-500">{t('No filters in this category')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(observer(FilterModal));
