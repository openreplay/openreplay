import { IconButton } from '@/ui/actions/IconButton';
import { ProgressBar } from '@/ui/data/ProgressBar';
import { Tooltip } from '@/ui/overlays/tooltip';
import { CircleArrowUp } from 'lucide-react';
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
  /** opens billing where you are; given, the meter grows an upgrade control */
  onUpgrade?: () => void;
}

export function RecordingsMeter({
  captured,
  included,
  resetsOn,
  onUpgrade,
}: RecordingsMeterProps) {
  const { t } = useTranslation();
  const pct = included > 0 ? Math.min(100, (captured / included) * 100) : 0;
  // red from nine tenths; at the limit the label says what it means
  const full = included > 0 && captured >= included;
  const tone = full ? 'full' : pct >= 90 ? 'near' : null;
  const title = full
    ? t(
        'All {{included}} recordings used. New sessions are not recorded until {{resetsOn}}, or until you upgrade.',
        { included: included.toLocaleString(), resetsOn },
      )
    : t(
        '{{captured}} of {{included}} recordings captured. Resets {{resetsOn}}.',
        {
          captured: captured.toLocaleString(),
          included: included.toLocaleString(),
          resetsOn,
        },
      );
  return (
    <div
      className={`m-meter${tone ? ` is-${tone}` : ''}`}
      role="group"
      aria-label={t('Recordings: {{captured}} of {{included}} captured', {
        captured,
        included,
      })}
    >
      <Tooltip side="top" title={title}>
        <span className="m-meter__read">
          <span className="m-meter__label">
            {full ? t('Limit reached') : t('Recordings')}
          </span>
          <ProgressBar
            value={pct}
            label={t("{{pct}}% of this month's recordings captured", {
              pct: Math.round(pct),
            })}
          />
          <span className="m-meter__value">
            {compact(captured)} / {compact(included)}
          </span>
        </span>
      </Tooltip>
      {onUpgrade && (
        <IconButton
          icon={<CircleArrowUp size={14} />}
          label={t('Upgrade')}
          variant="ghost"
          size="xs"
          onClick={onUpgrade}
        />
      )}
    </div>
  );
}
