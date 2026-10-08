import { IconButton } from '@/ui/actions/IconButton';
import { Chip } from '@/ui/data/Chip';
import { TYPES } from 'Types/session/event';
import copy from 'copy-to-clipboard';
import type { TFunction } from 'i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Copy,
  Hourglass,
  Keyboard,
  ListChecks,
  type LucideIcon,
  MousePointerClick,
  MoveHorizontal,
  Pointer,
  Smartphone,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFromMsFormatted } from 'App/date';
import { formatClock } from 'App/player-ui/clock';
import { numberWithCommas } from 'App/utils';

const RAGE = new Set<string>([
  TYPES.CLICKRAGE,
  TYPES.TAPRAGE,
  'mouse_thrashing',
]);

const GLYPH: Record<string, LucideIcon> = {
  [TYPES.CLICK]: MousePointerClick,
  [TYPES.DEAD_LICK]: MousePointerClick,
  [TYPES.INPUT]: Keyboard,
  [TYPES.LOCATION]: ArrowRight,
  [TYPES.CLICKRAGE]: Zap,
  [TYPES.TAPRAGE]: Zap,
  mouse_thrashing: Zap,
  [TYPES.TOUCH]: Pointer,
  [TYPES.SWIPE]: MoveHorizontal,
  [TYPES.IOS_VIEW]: Smartphone,
  [TYPES.INCIDENT]: AlertTriangle,
  [TYPES.UXT_EVENT]: ListChecks,
  TABCHANGE: ArrowLeftRight,
};

const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
};

interface Detail {
  top: string;
  sub?: string;
  /** which line is code: a URL or a selector */
  mono?: 'top' | 'sub';
  metrics?: string;
  signal?: 'frustration' | 'hesitation';
  error?: boolean;
  copy?: { text: string; label: string };
}

function describe(e: any, t: TFunction, isFirst: boolean): Detail {
  const hesitated = e.hesitation > 1000 ? 'hesitation' : undefined;
  switch (e.type) {
    case TYPES.LOCATION: {
      const notes = [t('Visited')];
      if (e.speedIndex != null)
        notes.push(
          t('speed index {{n}}', { n: numberWithCommas(e.speedIndex) }),
        );
      if (isFirst && e.referrer)
        notes.push(t('from {{ref}}', { ref: String(e.referrer) }));
      const metrics = [
        typeof e.fcpTime === 'number' &&
          `${t('Render')} ${numberWithCommas(e.fcpTime)}ms`,
        typeof e.visuallyComplete === 'number' &&
          `${t('Complete')} ${numberWithCommas(e.visuallyComplete)}ms`,
        typeof e.timeToInteractive === 'number' &&
          `${t('Interactive')} ${numberWithCommas(e.timeToInteractive)}ms`,
        ...Object.entries(e.webvitals ?? {}).map(
          ([k, v]) => `${k.toUpperCase()} ${v}`,
        ),
      ].filter(Boolean);
      return {
        top: pathOf(e.url ?? ''),
        sub: notes.join(' · '),
        mono: 'top',
        metrics: metrics.join(' · ') || undefined,
        copy: e.url ? { text: e.url, label: t('Copy URL') } : undefined,
      };
    }
    case TYPES.CLICK:
    case TYPES.DEAD_LICK:
      return {
        top: e.label || t('Click'),
        sub: e.selector,
        mono: 'sub',
        signal: hesitated,
        copy: e.selector
          ? { text: e.selector, label: t('Copy selector') }
          : undefined,
      };
    case TYPES.INPUT:
      return {
        top: e.label || t('Input'),
        sub: e.selector,
        mono: 'sub',
        signal: hesitated,
      };
    case TYPES.CLICKRAGE:
    case TYPES.TAPRAGE:
      return {
        top: e.label || t('Click rage'),
        sub: e.count ? t('{{n}} clicks', { n: e.count }) : undefined,
        signal: 'frustration',
      };
    case 'mouse_thrashing':
      return { top: t('Mouse thrashing'), signal: 'frustration' };
    case TYPES.TOUCH:
      return { top: e.label || t('Tap'), sub: t('Tapped') };
    case TYPES.SWIPE:
      return { top: t('Swipe {{direction}}', { direction: e.direction }) };
    case TYPES.IOS_VIEW:
      return { top: e.name, sub: t('View') };
    case TYPES.INCIDENT:
      return { top: t('Incident'), sub: e.label, error: true };
    case TYPES.UXT_EVENT:
      return {
        top: e.title,
        sub: `${t('Task {{n}}', { n: e.indexNum })} · ${durationFromMsFormatted(e.duration)}`,
        metrics: e.comment || undefined,
      };
    case 'TABCHANGE':
      return {
        top: `${e.fromTab} → ${e.toTab}`,
        sub: e.activeUrl,
        mono: 'sub',
      };
    default:
      return { top: e.label || e.name || e.type };
  }
}

interface Props {
  event: any;
  now: boolean;
  ahead: boolean;
  isFirst: boolean;
  onSeek: (time: number) => void;
}

function ActivityRow({ event, now, ahead, isFirst, onSeek }: Props) {
  const { t } = useTranslation();
  const d = describe(event, t, isFirst);
  const Glyph = GLYPH[event.type];
  const cls = ['m-spanel__row', now && 'is-now', ahead && 'is-ahead']
    .filter(Boolean)
    .join(' ');
  const tone = d.error ? ' is-error' : RAGE.has(event.type) ? ' is-rage' : '';

  return (
    <div className={cls} role="listitem" data-openreplay-label="Event">
      <button
        type="button"
        className="m-spanel__cell"
        onClick={() => onSeek(event.time)}
        aria-current={now ? 'step' : undefined}
        title={t('Jump to {{time}}', { time: formatClock(event.time) })}
      >
        <span className="m-spanel__time m-mono">{formatClock(event.time)}</span>
        <span className={`m-spanel__glyph${tone}`} aria-hidden="true">
          {Glyph ? <Glyph size={12} /> : null}
        </span>
        <span className="m-spanel__body">
          <span className="m-spanel__line">
            <span
              className={`m-spanel__label m-truncate${d.mono === 'top' ? ' m-mono' : ''}`}
              title={d.top}
            >
              {d.top}
            </span>
          </span>
          {d.sub && (
            <span
              className={`m-spanel__sub m-truncate${d.mono === 'sub' ? ' m-mono' : ''}`}
              title={d.sub}
            >
              {d.sub}
            </span>
          )}
          {d.metrics && (
            <span className="m-spanel__sub m-truncate" title={d.metrics}>
              {d.metrics}
            </span>
          )}
          {d.signal && (
            <span className="m-spanel__tags">
              <Chip
                title={
                  d.signal === 'frustration'
                    ? t('Repeated attempts at the same thing')
                    : t('A long pause before the next move')
                }
              >
                {d.signal === 'frustration' ? (
                  <Zap size={11} aria-hidden="true" />
                ) : (
                  <Hourglass size={11} aria-hidden="true" />
                )}
                {d.signal === 'frustration'
                  ? t('Frustration')
                  : t('Hesitation')}
              </Chip>
            </span>
          )}
        </span>
      </button>
      {d.copy && (
        <span className="m-spanel__verb">
          <IconButton
            icon={<Copy size={12} />}
            label={d.copy.label}
            variant="ghost"
            onClick={() => copy(d.copy!.text)}
          />
        </span>
      )}
    </div>
  );
}

export default React.memo(ActivityRow);
