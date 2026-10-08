import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './stepper.css';

export type StepStatus = 'done' | 'skipped' | 'ahead';

export interface StepperStep<K extends string = string> {
  key: K;
  label: ReactNode;

  hint?: ReactNode;
  status: StepStatus;
}

export interface StepperProps<K extends string = string> {
  steps: readonly StepperStep<K>[];

  current: K | null;

  onSelect?: (key: K) => void;

  size?: 'md' | 'sm';
  ariaLabel?: string;
}

export function Stepper<K extends string = string>({
  steps,
  current,
  onSelect,
  size = 'md',
  ariaLabel,
}: StepperProps<K>) {
  const { t } = useTranslation();
  const currentIndex =
    current == null ? steps.length : steps.findIndex((s) => s.key === current);
  return (
    <ol
      className={`m-stepper m-stepper--${size}`}
      aria-label={ariaLabel ?? t('Steps')}
    >
      {steps.map((s, i) => {
        const isCurrent = s.key === current;
        const reached = i < currentIndex;
        const cls = `m-stepper__item${isCurrent ? ' is-current' : ''}${s.status === 'done' ? ' is-done' : ''}${reached || isCurrent ? ' is-reached' : ''}`;
        const bullet = (
          <span className="m-stepper__bullet" aria-hidden="true">
            {s.status === 'done' ? (
              <Check
                size={size === 'sm' ? 11 : 13}
                strokeWidth={2.5}
                className="m-mark"
              />
            ) : isCurrent ? (
              <span className="m-stepper__now" />
            ) : (
              <span className="m-stepper__num">{i + 1}</span>
            )}
          </span>
        );
        const text = (
          <span className="m-stepper__text">
            <span className="m-stepper__label">{s.label}</span>
            {s.hint && <span className="m-stepper__hint">{s.hint}</span>}
          </span>
        );
        return (
          <li
            key={s.key}
            className={cls}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {onSelect ? (
              <button
                type="button"
                className="m-stepper__row m-hover"
                onClick={() => onSelect(s.key)}
              >
                {bullet}
                {text}
              </button>
            ) : (
              <span className="m-stepper__row">
                {bullet}
                {text}
              </span>
            )}
            {i < steps.length - 1 && (
              <span className="m-stepper__line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
