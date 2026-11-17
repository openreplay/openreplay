import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Check, ChevronDown, Pause, Play, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import './refresh-control.css';

export interface RefreshControlProps {
  every: number | null;
  paused: boolean;
  choices?: readonly number[];
  onEvery: (seconds: number | null) => void;
  onPause: (paused: boolean) => void;
  onRefresh: () => void;
}

const short = (s: number) => (s >= 60 ? `${s / 60}m` : `${s}s`);

export function RefreshControl({
  every,
  paused,
  choices = [5, 10, 30, 60],
  onEvery,
  onPause,
  onRefresh,
}: RefreshControlProps) {
  const { t } = useTranslation();
  const long = (s: number) =>
    s >= 60
      ? t('Every {{n}} min', { n: s / 60 })
      : t('Every {{n}} s', { n: s });
  const [turns, setTurns] = useState(0);
  const on = every != null;
  return (
    <div
      className={cn('m-refresh', on && 'is-on', paused && 'is-paused')}
      role="group"
      aria-label={t('Refresh')}
    >
      <Tooltip title={t('Refresh now')}>
        <button
          type="button"
          className="m-refresh__cell m-refresh__now"
          aria-label={t('Refresh')}
          onClick={() => {
            onRefresh();
            setTurns((n) => n + 1);
          }}
        >
          <RotateCw
            key={turns}
            size={14}
            className={turns > 0 ? 'is-turning' : undefined}
            aria-hidden="true"
          />
        </button>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="m-refresh__cell m-refresh__every"
            aria-label={
              !on
                ? t('Auto-refresh: off')
                : paused
                  ? t('Auto-refresh: {{every}}, paused', {
                      every: long(every!),
                    })
                  : t('Auto-refresh: {{every}}', { every: long(every!) })
            }
          >
            <span className="m-refresh__value">
              {on ? short(every!) : t('Off')}
            </span>
            <ChevronDown
              size={12}
              className="m-refresh__caret"
              aria-hidden="true"
            />
            {on && (
              <span
                key={`${every}-${paused}`}
                className="m-refresh__countdown"
                style={{ animationDuration: `${every}s` }}
                aria-hidden="true"
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItems
            items={[
              {
                key: 'off',
                label: t('Off'),
                icon: on ? (
                  <span className="m-refresh__blank" />
                ) : (
                  <Check size={13} />
                ),
                onClick: () => onEvery(null),
              },
              { key: 'd', type: 'divider' },
              ...choices.map((s) => ({
                key: String(s),
                label: long(s),
                icon:
                  every === s ? (
                    <Check size={13} />
                  ) : (
                    <span className="m-refresh__blank" />
                  ),
                onClick: () => onEvery(s),
              })),
            ]}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {on && (
        <Tooltip title={paused ? t('Resume') : t('Pause')}>
          <button
            type="button"
            className="m-refresh__cell m-refresh__pause"
            aria-label={
              paused ? t('Resume auto-refresh') : t('Pause auto-refresh')
            }
            aria-pressed={paused}
            onClick={() => onPause(!paused)}
          >
            {paused ? (
              <Play size={13} aria-hidden="true" />
            ) : (
              <Pause size={13} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
