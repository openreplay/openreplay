import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './start-path.css';

export interface StartStep {
  icon: ReactNode;

  label: string;

  hint?: string;
}

export function StartPath({
  steps,
  ariaLabel,
}: {
  steps: readonly StartStep[];
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <ol
      className="m-path"
      aria-label={ariaLabel ?? t('How to start')}
      data-slot="start-path"
    >
      {steps.map((s, i) => (
        <li key={i} className="m-path__step">
          <span className="m-path__ring" aria-hidden="true">
            {s.icon}
            <span className="m-path__n">{i + 1}</span>
          </span>
          <span className="m-path__text">
            <span className="m-path__label">{s.label}</span>
            {s.hint && <span className="m-path__hint">{s.hint}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
