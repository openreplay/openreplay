import cn from 'classnames';
import { ChevronRight, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import JumpButton, {
  RowCopy,
} from 'App/components/shared/DevTools/JumpButton/JumpButton';
import { getDateFromString } from 'App/date';

export function TableHeader({ size }: { size: number }) {
  const { t } = useTranslation();
  return (
    <div className="m-dt__row m-dt__blhead is-inert">
      <span className="m-dt__rowopen is-empty" aria-hidden="true" />
      <span className="m-dt__blts">{t('Time')}</span>
      <span className="flex-1">{t('Message')}</span>
      <span>{t('{{count}} records', { count: size })}</span>
    </div>
  );
}

const LEVEL = {
  ERROR: { cls: 'error', Icon: CircleAlert },
  WARN: { cls: 'warn', Icon: TriangleAlert },
} as const;

/** One backend log line, on the console row's look; multi-line messages expand. */
export function LogRow({
  log,
  onJump,
  isActive,
}: {
  log: { timestamp: string; status: string; content: string };
  onJump: (ts: number) => void;
  isActive?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  // providers report levels in their own casing (Elastic "warning", Sentry "error", Datadog "ERROR")
  const status = String(log.status ?? '').toUpperCase();
  const level =
    status === 'ERROR' || status === 'CRITICAL' || status === 'FATAL'
      ? LEVEL.ERROR
      : status.startsWith('WARN')
        ? LEVEL.WARN
        : undefined;
  const Icon = level?.Icon ?? Info;
  const lines = log.content.split('\n');
  const canExpand = lines.length > 1 || log.content.length > 160;

  return (
    <div
      className={cn('m-dt__row m-dt__log has-tail group', {
        'is-error': level?.cls === 'error',
        'is-warn': level?.cls === 'warn',
        'is-open': open,
        'is-now': isActive,
        'is-inert': !canExpand,
      })}
      onClick={canExpand ? () => setOpen((o) => !o) : undefined}
    >
      <span
        className={cn('m-dt__rowopen', { 'is-empty': !canExpand })}
        aria-expanded={canExpand ? open : undefined}
        aria-label={
          canExpand ? (open ? t('Collapse') : t('Expand')) : undefined
        }
      >
        {canExpand && <ChevronRight size={11} />}
      </span>
      <Icon
        size={12}
        className={`m-dt__level is-${level?.cls ?? 'info'}`}
        aria-hidden="true"
      />
      <span className="m-dt__blts m-mono">
        {getDateFromString(log.timestamp)}
      </span>
      <span className="m-dt__logtext m-mono">{lines[0]}</span>
      {open && <pre className="m-dt__logbody m-mono">{log.content}</pre>}
      <JumpButton
        extra={<RowCopy text={log.content} />}
        onClick={
          log.timestamp === 'N/A'
            ? undefined
            : () => onJump(new Date(log.timestamp).getTime())
        }
      />
    </div>
  );
}
