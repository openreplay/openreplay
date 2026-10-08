import { useTranslation } from 'react-i18next';

import './impact-meter.css';

export type ImpactLevel = 'High' | 'Medium' | 'Low';

const FILLED: Record<ImpactLevel, number> = { High: 3, Medium: 2, Low: 1 };
const TONE: Record<ImpactLevel, string> = {
  High: 'var(--m-impact-high)',
  Medium: 'var(--m-impact-medium)',
  Low: 'var(--m-impact-low)',
};

export function ImpactMeter({
  level,
  compact = false,
}: {
  level: ImpactLevel;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const filled = FILLED[level];
  return (
    <span
      className="m-impact"
      role="img"
      aria-label={t('{{level}} impact', { level: t(level) })}
    >
      <span className="m-impact__bars" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="m-impact__bar"
            style={{
              height: `${(i + 1) * 3 + 2}px`,
              background: i < filled ? TONE[level] : 'var(--m-impact-track)',
            }}
          />
        ))}
      </span>
      {!compact && <span className="m-impact__label">{t(level)}</span>}
    </span>
  );
}
