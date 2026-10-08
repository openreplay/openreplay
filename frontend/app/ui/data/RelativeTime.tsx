import { Tooltip } from '@/ui/overlays/tooltip';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

export interface RelativeTimeProps {
  /** Epoch milliseconds or an ISO string. */
  at: number | string;
  timezone?: string;
  /** a second clock for the tooltip, e.g. the session user's own time */
  alsoIn?: { label: string; timezone: string };
}

export function RelativeTime({ at, timezone, alsoIn }: RelativeTimeProps) {
  const { t } = useTranslation();
  const zone = timezone ? { zone: timezone } : {};
  const date =
    typeof at === 'string'
      ? DateTime.fromISO(at, zone)
      : DateTime.fromMillis(at, zone);
  if (!date.isValid)
    return <span className="text-xs text-content-muted">—</span>;
  const ago = Date.now() - date.toMillis();
  const label =
    ago < MIN
      ? t('just now')
      : ago < 60 * MIN
        ? t('{{n}}m ago', { n: Math.round(ago / MIN) })
        : ago < DAY
          ? t('{{n}}h ago', { n: Math.round(ago / (60 * MIN)) })
          : ago < 7 * DAY
            ? t('{{n}}d ago', { n: Math.round(ago / DAY) })
            : date.toFormat('LLL d');
  const full = date.toFormat('LLL d, yyyy, HH:mm');
  const other = alsoIn ? date.setZone(alsoIn.timezone) : null;
  return (
    <Tooltip
      title={
        other?.isValid ? (
          <>
            {full}
            <br />
            {alsoIn!.label}: {other.toFormat('LLL d, yyyy, HH:mm')}
          </>
        ) : (
          full
        )
      }
      delay={200}
    >
      <time
        dateTime={date.toISO() ?? undefined}
        className="text-xs text-content-muted [font-family:var(--m-font-num)] tabular-nums cursor-default"
      >
        {label}
      </time>
    </Tooltip>
  );
}
