import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import { useRun } from '../queries';
import RunDetailView from './RunDetailView';
import { Run } from './shared/types';
import { formatDuration, getRunStatusTag } from './shared/utils';

function RunRow({ run, testName }: { run: Run; testName?: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  // Load full step detail (screenshots, failure info) only once opened.
  const { data: detail, isPending } = useRun(expanded ? run.runId : undefined);

  return (
    <div className="border-b last:border-b-0">
      <div
        className="grid grid-cols-12 py-3 px-4 items-center cursor-pointer hover:bg-active-blue select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-1">
          <ChevronRight
            size={14}
            className="transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          />
        </div>
        <div className="col-span-3">
          <div>{testName ?? detail?.testName ?? run.testId}</div>
          <div className="text-xs text-disabled-text">
            {run.stepsCount} {t('steps')}
          </div>
        </div>
        <div className="col-span-3">
          {run.startedAt
            ? formatDateTimeDefault(new Date(run.startedAt).getTime())
            : '—'}
        </div>
        <div className="col-span-2">{formatDuration(run.durationMs)}</div>
        <div className="col-span-3 text-end">
          {getRunStatusTag(run.status, t)}
        </div>
      </div>
      {expanded &&
        (isPending || !detail ? (
          <div className="p-4">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : (
          <RunDetailView detail={detail} />
        ))}
    </div>
  );
}

export default RunRow;
