import { ProgressBar } from '@/ui/data/ProgressBar';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useTranslation } from 'react-i18next';

import './recordings-meter.css';

const compact = (n: number): string =>
  n >= 1_000_000
    ? `${+(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `${+(n / 1000).toFixed(1)}k`
      : String(n);

export interface RecordingsMeterProps {
  captured: number;

  included: number;

  resetsOn: string;
}

export function RecordingsMeter({
  captured,
  included,
  resetsOn,
}: RecordingsMeterProps) {
  const { t } = useTranslation();
  const pct = included > 0 ? Math.min(100, (captured / included) * 100) : 0;
  return (
    <Tooltip
      side="top"
      title={t(
        '{{captured}} of {{included}} recordings captured. Resets {{resetsOn}}.',
        {
          captured: captured.toLocaleString(),
          included: included.toLocaleString(),
          resetsOn,
        },
      )}
    >
      <div
        className="m-meter"
        role="group"
        aria-label={t('Recordings: {{captured}} of {{included}} captured', {
          captured,
          included,
        })}
      >
        <span className="m-meter__label">{t('Recordings')}</span>
        <ProgressBar
          value={pct}
          label={t("{{pct}}% of this month's recordings captured", {
            pct: Math.round(pct),
          })}
        />
        <span className="m-meter__value">
          {compact(captured)} / {compact(included)}
        </span>
      </div>
    </Tooltip>
  );
}
