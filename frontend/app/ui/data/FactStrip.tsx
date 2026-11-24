import type { ReactNode } from 'react';

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
                {f.empty ? '-' : f.value}
              </dd>
            </div>
          );
        }),
      )}
    </dl>
  );
}
