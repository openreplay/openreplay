import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export type SortOrder = 'ascend' | 'descend' | null;

export function SortIcon({ sortOrder }: { sortOrder: SortOrder }) {
  const Icon =
    sortOrder === 'ascend'
      ? ChevronUp
      : sortOrder === 'descend'
        ? ChevronDown
        : ChevronsUpDown;
  return (
    <span
      className={cn(
        'm-sort m-hover inline-flex items-center text-content-decorative group-hover/th:text-content-secondary',
        sortOrder &&
          'is-on text-content-primary group-hover/th:text-content-primary',
      )}
      aria-hidden="true"
    >
      <Icon size={13} strokeWidth={1.75} />
    </span>
  );
}
