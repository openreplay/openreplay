import { Tooltip } from '@/ui/overlays/tooltip';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PixelArrow, PixelBurst } from './PixelArt';
import './ai.css';

export interface AiLockedRowProps {
  children: ReactNode;
  hint?: ReactNode;
  onUnlock: () => void;
  icon?: ReactNode;
  compact?: boolean;
}

export function AiLockedRow({
  children,
  hint,
  onUnlock,
  icon,
  compact,
}: AiLockedRowProps) {
  const { t } = useTranslation();
  const [live, setLive] = useState(false);
  return (
    <Tooltip title={t('Your account doesn’t include Armada yet')}>
      <button
        type="button"
        className={`m-ailock${compact ? ' m-ailock--compact' : ''}`}
        onClick={onUnlock}
        onPointerEnter={() => setLive(true)}
        onPointerLeave={() => setLive(false)}
        onFocus={() => setLive(true)}
        onBlur={() => setLive(false)}
      >
        <span className="m-ailock__box" aria-hidden="true" />
        {icon != null && (
          <span className="m-ailock__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="m-ailock__lead">
          <span className="m-ailock__label">{children}</span>
          {hint != null && <span className="m-ailock__hint">{hint}</span>}
        </span>
        <span className="m-ailock__get">
          <PixelBurst playing={live} className="m-ailock__burst" />
          {t('Get Armada')}
          <PixelArrow className="m-pxarrow" />
        </span>
      </button>
    </Tooltip>
  );
}
