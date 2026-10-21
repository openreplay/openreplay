import type { TableSort } from '@/ui/data/table';
import { useMemo, useState } from 'react';

export function useLocalSort<T>(
  rows: readonly T[],
  comparators: Record<string, (a: T, b: T) => number>,
) {
  const [sort, setSort] = useState<TableSort | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const cmp = comparators[sort.key];
    if (!cmp) return rows;
    const out = [...rows].sort(cmp);
    return sort.desc ? out.reverse() : out;
  }, [rows, sort, comparators]);
  const onSort = (key: string | null, desc: boolean) =>
    setSort(key ? { key, desc } : null);
  return { sort, onSort, sorted };
}
