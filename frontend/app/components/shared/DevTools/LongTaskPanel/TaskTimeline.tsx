import React from 'react'
import { Tooltip } from 'antd'
import { LongAnimationTask } from "./type";
import cn from "classnames";

function TaskTimeline({ task }: { task: LongAnimationTask }) {
  const totalDuration = task.duration;
  const scriptDuration = task.scripts.reduce((sum, script) => sum + script.duration, 0);
  const layoutDuration = task.scripts.reduce(
    (sum, script) => sum + (script.forcedStyleAndLayoutDuration || 0),
    0
  );
  const idleDuration = totalDuration - scriptDuration - layoutDuration;

  const scriptWidth = (scriptDuration / totalDuration) * 100;
  const layoutWidth = (layoutDuration / totalDuration) * 100;
  const idleWidth = (idleDuration / totalDuration) * 100;

  const getSeverityClass = (duration) => {
    if (duration > 200) return 'bg-[#e7000b]';
    if (duration > 100) return 'bg-[#efb100]';
    return 'bg-[#51a2ff]';
  };

  return (
    <div className="w-full mb-2">
      <div className="text-gray-dark mb-1">Timeline:</div>
      <div className="flex h-4 w-full rounded-sm overflow-hidden">
        {scriptDuration > 0 && (
          <TimelineSegment
            classes={`${getSeverityClass(scriptDuration)} h-full`}
            name={`Script: ${scriptDuration.toFixed(2)}ms`}
            width={scriptWidth}
          />
        )}
        {idleDuration > 0 && (
          <TimelineSegment
            classes="bg-gray-light h-full"
            width={idleWidth}
            name={`Idle: ${idleDuration.toFixed(2)}ms`}
          />
        )}
        {layoutDuration > 0 && (
          <TimelineSegment
            classes="bg-[#8200db] h-full"
            width={layoutWidth}
            name={`Layout & Style: ${layoutDuration.toFixed(2)}ms`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>start: {task.startTime.toFixed(2)}ms</span>
        <span>finish: {(task.startTime + task.duration).toFixed(2)}ms</span>
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
      <div
        style={{ width: `${width}%` }}
        className={cn(classes)}
      />
    </Tooltip>
  );
}

export default TaskTimeline;