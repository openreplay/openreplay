import React, { useEffect, useState } from 'react';
import { FilterType } from 'Types/filter/filterType';
import type { ComponentType } from 'react';
import { Hash, ALargeSmall, MousePointerClick } from 'lucide-react';
import { Filter } from '@/mstore/types/filterConstants';

type IconProps = { size: number; className?: string };
type FilterIconMap = Record<FilterType, ComponentType<IconProps>>;

const iconProps: IconProps = { size: 14 };

export const PropertyIconMap = {
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

export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    auto_captured: 'Autocapture',
    user_events: 'Events',
  };

  if (categoryMap[category]) {
    return categoryMap[category];
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
};

export const groupFiltersByCategory = (
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

export const getFilteredEntries = (
  query: string,
  grouped: Record<string, Filter[]>,
  type?: 'Events' | 'Filters' | 'Properties',
) => {
  const trimmed = query.trim().toLowerCase();
  const all = `All${type ? ` ${type}` : ''}`;
  if (!Object.keys(grouped).length)
    return { matchingCategories: [all], matchingFilters: {} };
  const categories = Object.keys(grouped);
  if (!trimmed)
    return {
      matchingCategories: [all, ...categories],
      matchingFilters: grouped,
    };
  const matched = new Set<string>([all]);
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
    matchingCategories: [all, ...categories.filter((c) => matched.has(c))],
    matchingFilters: filtersMap,
  };
};

export const useDebounce = (value: any, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
};
