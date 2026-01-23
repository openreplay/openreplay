import React from 'react'
import { Tooltip } from 'antd'
import { LongAnimationTask } from "./type";
import cn from "classnames";

const getSeverityClass = (duration: number) => {
  if (duration > 200) return 'bg-[#CC0000]';
  if (duration > 100) return 'bg-[#EFB100]';
  return 'bg-[#66a299]';
};

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

  return (
    <div className="w-full mb-2 mt-1">
      <div className="text-gray-dark mb-1">Timeline:</div>
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
            classes="bg-gray-light h-full bg-[repeating-linear-gradient(45deg,#ccc_0px,#ccc_5px,#f2f2f2_5px,#f2f2f2_10px)]"
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
        <span>start: {Math.round(task.startTime)}ms</span>
        <span>finish: {Math.round(task.startTime + task.duration)}ms</span>
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
