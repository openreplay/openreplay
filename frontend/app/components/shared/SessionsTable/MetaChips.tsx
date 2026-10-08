import { Tooltip } from '@/ui/overlays/tooltip';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './meta-chips.css';

export interface MetaChipsProps {
  metadata: Record<string, string | null>;
  max?: number;
  onPick?: (key: string, value: string) => void;
  empty?: ReactNode;
}

export function MetaChips({
  metadata,
  max = 2,
  onPick,
  empty = null,
}: MetaChipsProps) {
  const { t } = useTranslation();
  const pairs = Object.entries(metadata ?? {}).filter(
    (p): p is [string, string] => p[1] != null && p[1] !== '',
  );
  if (!pairs.length) return <>{empty}</>;
  return (
    <span className="m-ss__meta">
      {pairs.slice(0, max).map(([k, v]) =>
        onPick ? (
          <Tooltip
            key={k}
            title={t('Search for {{key}} is {{value}}', { key: k, value: v })}
          >
            <button
              type="button"
              className="m-ss__meta-chip"
              onClick={() => onPick(k, v)}
            >
              {v}
            </button>
          </Tooltip>
        ) : (
          <span
            key={k}
            className="m-ss__meta-chip is-still"
            title={`${k}: ${v}`}
          >
            {v}
          </span>
        ),
      )}
      {pairs.length > max && (
        <Tooltip
          title={pairs
            .slice(max)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')}
        >
          <span className="m-ss__more">+{pairs.length - max}</span>
        </Tooltip>
      )}
    </span>
  );
}
