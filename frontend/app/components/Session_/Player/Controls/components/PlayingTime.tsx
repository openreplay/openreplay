import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  RealReplayTimeConnected,
  RealUserReplayTimeConnected,
  ReduxTime,
} from 'Components/Session_/Player/Controls/Time';

import { type ITimeMode, TimeMode } from './timeMode';

interface Props {
  timeMode: ITimeMode;
  startedAt: number;
  setTimeMode: (mode: ITimeMode) => void;
  sessionTz?: string;
}

function PlayingTime({ timeMode, setTimeMode, startedAt, sessionTz }: Props) {
  const { t } = useTranslation();
  const elapsed = (
    <>
      <ReduxTime isCustom name="time" format="mm:ss" />
      <span className="m-tl__time-sep">/</span>
      <ReduxTime isCustom name="endTime" format="mm:ss" />
    </>
  );
  const modes: { mode: ITimeMode; label: string; value: React.ReactNode }[] = [
    {
      mode: TimeMode.Timestamp,
      label: t('Current / session duration'),
      value: elapsed,
    },
    ...(sessionTz
      ? [
          {
            mode: TimeMode.UserReal,
            label: t("User's time"),
            value: (
              <RealUserReplayTimeConnected
                startedAt={startedAt}
                sessionTz={sessionTz}
              />
            ),
          },
        ]
      : []),
    {
      mode: TimeMode.Real,
      label: t('Your time'),
      value: <RealReplayTimeConnected startedAt={startedAt} />,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="m-tl__time">
          <span className="flex items-center gap-1">
            <span className="flex items-center">
              {timeMode === TimeMode.Real ? (
                <RealReplayTimeConnected startedAt={startedAt} />
              ) : timeMode === TimeMode.UserReal ? (
                <RealUserReplayTimeConnected
                  startedAt={startedAt}
                  sessionTz={sessionTz}
                />
              ) : (
                elapsed
              )}
            </span>
            <ChevronDown size={11} aria-hidden="true" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <p className="px-5 pb-2 pt-1 text-2xs font-medium uppercase tracking-wider text-content-muted">
          {t('Playback time')}
        </p>
        {modes.map((m) => (
          <DropdownMenuItem
            key={m.mode}
            className="h-auto py-2"
            onSelect={() => setTimeMode(m.mode)}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-content-muted">{m.label}</span>
              <span className="m-mono flex items-center text-content-primary">
                {m.value}
              </span>
            </span>
            {(timeMode ?? TimeMode.Timestamp) === m.mode && (
              <Check size={14} className="text-content-accent" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PlayingTime;
