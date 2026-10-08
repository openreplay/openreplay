import { Tooltip } from '@/ui/overlays/tooltip';
import type { TFunction } from 'i18next';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import './critical-flag.css';

export type CriticalState = 'none' | 'team' | 'mine' | 'dismissed';

export interface CriticalFlagProps {
  state: CriticalState;

  matchedBy?: string;
  onClick: () => void;
}

const label = (
  t: TFunction,
  state: CriticalState,
  matchedBy?: string,
): string => {
  switch (state) {
    case 'mine':
      return t('Matches your description');
    case 'team':
      return matchedBy
        ? t("Matches {{name}}'s description", { name: matchedBy })
        : t('Matches a description');
    case 'dismissed':
      return t('Not critical for you');
    case 'none':
      return t('Describe what is critical');
  }
};

export function CriticalFlag({ state, matchedBy, onClick }: CriticalFlagProps) {
  const { t } = useTranslation();
  const text = label(t, state, matchedBy);
  return (
    <Tooltip title={text} delay={300}>
      <button
        type="button"
        className={`m-crit m-crit--${state}`}
        aria-label={text}
        aria-pressed={state === 'mine' || state === 'team'}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
