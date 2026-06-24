import { Button, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  ChevronRight,
  Loader,
  Pause,
  RotateCw,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

import { RunData } from './shared/types';
import { RUNS_GRID, formatDuration, relativeTime } from './shared/utils';

interface Props {
  run: RunData;
  today?: boolean;
  onOpen: (run: RunData) => void;
}

/** A collapsed run row on the shared runs grid. Clicking opens the run drawer.
 *  Today's runs get an indigo left accent so recency reads without day-grouping. */
function RunRow({ run, today, onOpen }: Props) {
  const { t } = useTranslation();

  const running = run.status === 'running';
  const failed = run.status === 'failed';
  const total = run.steps.length;
  const currentIdx = run.steps.findIndex((s) => s.status === 'running');

  const result = running ? (
    <span className="flex items-center gap-1.5 text-indigo">
      <Loader size={15} className="animate-spin shrink-0" />
      {t('Running')}
    </span>
  ) : failed ? (
    <span className="flex items-center gap-1.5 text-red">
      <XCircle size={15} className="shrink-0" />
      {t('Failed')}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-green-dark">
      <CheckCircle2 size={15} className="shrink-0" />
      {t('Passed')}
    </span>
  );

  const rerun = () =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);
  const pause = () => message.info(`${run.testName} — ${t('run paused')}`);

  return (
    <div
      className={`${RUNS_GRID} px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-active-blue select-none text-sm`}
      style={{
        borderLeft: `2px solid ${today ? 'var(--color-indigo)' : 'transparent'}`,
      }}
      onClick={() => onOpen(run)}
    >
      {/* Result */}
      <div className="min-w-0 font-medium">{result}</div>

      {/* Test */}
      <span className="font-medium truncate">{run.testName}</span>

      {/* Tags */}
      <div className="flex items-center gap-1 overflow-hidden">
        {run.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded bg-gray-lightest text-disabled-text truncate"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Environment */}
      <span className="text-disabled-text truncate">{run.envName ?? '—'}</span>

      {/* Duration */}
      <span className="text-disabled-text">
        {running
          ? `${currentIdx + 1}/${total}`
          : run.duration
            ? formatDuration(run.duration)
            : '—'}
      </span>

      {/* When */}
      <Tooltip title={formatDateTimeDefault(run.date)}>
        <span className="text-disabled-text truncate">
          {relativeTime(run.date)}
        </span>
      </Tooltip>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5">
        <span onClick={(e) => e.stopPropagation()}>
          {running ? (
            <Button size="small" icon={<Pause size={13} />} onClick={pause}>
              {t('Pause')}
            </Button>
          ) : (
            <Tooltip title={t('Rerun')}>
              <Button
                type="text"
                size="small"
                icon={<RotateCw size={15} />}
                aria-label={t('Rerun')}
                onClick={rerun}
              />
            </Tooltip>
          )}
        </span>
        <ChevronRight size={15} className="text-disabled-text shrink-0" />
      </div>
    </div>
  );
}

export default RunRow;
