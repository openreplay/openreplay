import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from '@/ui/actions/dropdown-menu';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './fact-strip.css';

export interface Fact {
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: 'danger' | 'warning';
  /** full value on hover; defaults to a string value */
  title?: string;
  /** keeps the cell with a quiet dash */
  empty?: boolean;
  /** opened from the value, which hovers like a row */
  menu?: readonly MenuItem[];
  /** already in the search: filtered by, or left out */
  state?: 'in' | 'out';
}

function FactValue({ f }: { f: Fact }) {
  const { t } = useTranslation();
  if (f.empty) return <>-</>;
  if (!f.menu?.length) return <>{f.value}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`m-facts__door${f.state ? ` is-${f.state}` : ''}`}
          aria-label={t('{{label}}: {{value}}, options', {
            label: f.label,
            value: typeof f.value === 'string' ? f.value : '',
          })}
        >
          {f.value}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="m-kv__menu">
        <DropdownMenuItems items={f.menu} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Facts as label over value. Every group is one row of `columns` and every value
    one truncated line, so the strip keeps its shape when the facts change under it. */
export function FactStrip({
  groups,
  columns,
  ariaLabel,
}: {
  groups: ReadonlyArray<readonly Fact[]>;
  /** grid-template-columns */
  columns: string;
  ariaLabel?: string;
}) {
  return (
    <dl
      className="m-facts"
      style={{ gridTemplateColumns: columns }}
      aria-label={ariaLabel}
    >
      {groups.map((g) =>
        g.map((f) => {
          const cls = [
            f.mono && !f.empty && 'is-mono',
            f.tone && `is-${f.tone}`,
            f.empty && 'is-empty',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={f.label} className="m-facts__cell">
              <dt>{f.label}</dt>
              <dd
                className={cls || undefined}
                title={
                  f.empty
                    ? undefined
                    : (f.title ??
                      (typeof f.value === 'string' ? f.value : undefined))
                }
              >
                <FactValue f={f} />
              </dd>
            </div>
          );
        }),
      )}
    </dl>
  );
}
