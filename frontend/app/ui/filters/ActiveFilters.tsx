import { Button } from '@/ui/actions/button';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import './active-filters.css';

export interface ActiveFilterChip<K extends string = string> {
  key: K;
  value: string;
  dimension: string;
  label: string;
}

/** The applied filters as removable chips, with the count they leave. */
export function ActiveFilters<K extends string = string>({
  chips,
  onRemove,
  onClearAll,
  resultCount,
  noun,
}: {
  chips: readonly ActiveFilterChip<K>[];
  onRemove: (key: K, value: string) => void;
  onClearAll: () => void;
  resultCount?: number;
  noun: readonly [string, string];
}) {
  const { t } = useTranslation();
  if (chips.length === 0) return null;
  return (
    <div className="m-af" role="region" aria-label={t('Applied filters')}>
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          className="m-af__chip"
          onClick={() => onRemove(c.key, c.value)}
          aria-label={t('Remove filter {{dim}}: {{value}}', {
            dim: c.dimension,
            value: c.label,
          })}
        >
          <span className="m-af__dim">{c.dimension}</span>
          <span className="m-af__val m-truncate">{c.label}</span>
          <X size={11} aria-hidden="true" />
        </button>
      ))}
      {resultCount != null && (
        <span className="m-af__result">
          {resultCount.toLocaleString()} {resultCount === 1 ? noun[0] : noun[1]}
        </span>
      )}
      <Button variant="subtle" onClick={onClearAll} className="m-af__clear">
        {t('Clear all')}
      </Button>
    </div>
  );
}
