import type FilterItem from 'App/mstore/types/filterItem';

/** One-line human summary of a segment's query, for popover rows and tooltips. */
export function summarize(filters: FilterItem[]): string {
  if (!filters.length) return 'All traffic';
  return filters
    .map((f) => {
      const label = f.displayName || f.name;
      const vals = (f.value ?? []).filter((v) => v !== '' && v != null);
      return vals.length
        ? `${label} ${f.operator ?? '='} ${vals.join(', ')}`
        : label;
    })
    .join(' · ');
}
