import { Search, Loader } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Input, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';
import { VList } from 'virtua';
import { FilterKey } from 'Types/filter/filterType';
import { FilterItem, CategoryList } from './components';
import {
  getIconForFilter,
  groupFiltersByCategory,
  getFilteredEntries,
  useDebounce,
} from './utils';

function FilterModal({
  onFilterClick = () => null,
  filters = [],
  activeFilters = [],
  type,
}: {
  onFilterClick: (f: Filter) => void;
  filters: Filter[];
  activeFilters?: string[];
  type?: 'Events' | 'Filters' | 'Properties';
}) {
  const eventModal = filters.every((f) => f.isEvent) || type === 'Events';
  const inputRef = React.useRef(null);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);
  const [category, setCategory] = useState('All');
  const groupedFilters = useMemo(
    () => groupFiltersByCategory(filters),
    [filters],
  );
  const { matchingCategories, matchingFilters } = useMemo(
    () => getFilteredEntries(debouncedQuery, groupedFilters, type),
    [debouncedQuery, groupedFilters, type],
  );
  const displayedFilters = useMemo(() => {
    let filters = [];
    if (category.startsWith('All')) {
      filters = matchingCategories
        .filter((cat) => !cat.startsWith('All'))
        .flatMap((cat) =>
          (matchingFilters[cat] || []).map((filter) => ({
            ...filter,
            category: cat,
          })),
        );
    } else {
      filters = matchingFilters[category] || [];
    }
    if (eventModal) {
      return filters;
    } else {
      return filters.filter((f) => {
        return !activeFilters?.includes(f.name);
      });
    }
  }, [category, matchingFilters, matchingCategories, activeFilters]);

  const isResultEmpty = useMemo(
    () =>
      matchingCategories.length <= 1 &&
      Object.keys(matchingFilters).length === 0,
    [matchingCategories, matchingFilters],
  );

  const handleFilterClick = useCallback(
    (filter: Filter) => {
      if (filter.subCategory?.startsWith('issue')) {
        filter.value = [filter.name];
        filter.name = FilterKey.ISSUE;
        filter.displayName = 'Issue';
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

  const noFilters = !filters || filters.length === 0;
  const allAdded = displayedFilters.length === 0;
  if (noFilters) {
    return (
      <div className="w-[90vw] mx-[2vw] md:mx-0 md:w-[490px] h-[200px] gap-2 flex items-center justify-center bg-white">
        <Loader size={26} className="text-gray-400 animate-spin" />
        <Typography.Text type="secondary">
          {t('Loading filters...')}
        </Typography.Text>
      </div>
    );
  }

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
              {allAdded ? (
                <div className="h-full flex items-center flex-col justify-center text-center">
                  <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={30} />
                  <div className="font-medium mt-4 text-neutral-600">
                    {t('All possible filters are added.')}
                  </div>
                </div>
              ) : (
                <VList style={{ height: 300 }} data={displayedFilters}>
                  {(filter, i) => (
                    <FilterItem
                      key={filter.id || filter.name}
                      filter={filter}
                      disabled={
                        !filter.isEvent && activeFilters?.includes(filter.name)
                      }
                      onClick={handleFilterClick}
                      showCategory
                    />
                  )}
                </VList>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(observer(FilterModal));
