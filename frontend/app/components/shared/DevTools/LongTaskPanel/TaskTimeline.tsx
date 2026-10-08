import { Tooltip } from '@/ui/overlays/tooltip';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { LongAnimationTask } from './type';

const getSeverityClass = (duration: number) => {
  if (duration > 200) return 'bg-[#CC0000]';
  if (duration > 100) return 'bg-[#EFB100]';
  return 'bg-[#66a299]';
};

function TaskTimeline({ task }: { task: LongAnimationTask }) {
  const { t } = useTranslation();
  const totalDuration = task.duration;
  const scriptDuration = task.scripts.reduce(
    (sum, script) => sum + script.duration,
    0,
  );
  const layoutDuration = task.scripts.reduce(
    (sum, script) => sum + (script.forcedStyleAndLayoutDuration || 0),
    0,
  );
  const idleDuration = totalDuration - scriptDuration - layoutDuration;

  const scriptWidth = (scriptDuration / totalDuration) * 100;
  const layoutWidth = (layoutDuration / totalDuration) * 100;
  const idleWidth = (idleDuration / totalDuration) * 100;

  return (
    <div className="w-full mb-2 mt-1">
      <div className="text-content-secondary mb-1">{t('Timeline:')}</div>
      <div className="flex h-2 w-full rounded-sm overflow-hidden">
        {scriptDuration > 0 && (
          <TimelineSegment
            classes={`${getSeverityClass(scriptDuration)} h-full`}
            name={`Script: ${Math.round(scriptDuration)}ms`}
            width={scriptWidth}
          />
        )}
        {idleDuration > 0 && (
          <TimelineSegment
            classes="bg-surface-sunken h-full bg-[repeating-linear-gradient(45deg,var(--m-border-default)_0px,var(--m-border-default)_5px,var(--m-surface-sunken)_5px,var(--m-surface-sunken)_10px)]"
            width={idleWidth}
            name={`Idle: ${Math.round(idleDuration)}ms`}
          />
        )}
        {layoutDuration > 0 && (
          <TimelineSegment
            classes="bg-[#8200db] h-full"
            width={layoutWidth}
            name={`Layout & Style: ${Math.round(layoutDuration)}ms`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>
          {t('start:')} {Math.round(task.startTime)}ms
        </span>
        <span>
          {t('finish:')} {Math.round(task.startTime + task.duration)}ms
        </span>
      </div>
    </div>
  );
}

function TimelineSegment({
  name,
  classes,
  width,
}: {
  name: string;
  width: number;
  classes: string;
}) {
  return (
    <Tooltip title={name}>
      <div style={{ width: `${width}%` }} className={cn(classes)} />
    </Tooltip>
  );
}

export default TaskTimeline;
