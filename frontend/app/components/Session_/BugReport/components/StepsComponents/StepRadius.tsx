import React from 'react';
import { Tooltip } from 'UI'

interface Props {
  pickRadius: number;
  setRadius: (v: number) => void;
  stepsNum: number;
}

function StepRadius({ pickRadius, setRadius, stepsNum }: Props) {
  return (
    <div className="w-full flex items-center gap-4">
      <div className="border-b border-dotted border-gray-medium cursor-help">
        {/* @ts-ignore */}
        <Tooltip title={<span>Closest step to the selected timestamp &plusmn; {pickRadius}.</span>}>
        <span>&plusmn; {pickRadius}</span>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="rounded px-2 bg-light-blue-bg cursor-pointer hover:bg-teal-light"
          onClick={() => pickRadius < Math.floor(stepsNum/2) ? setRadius(pickRadius + 1) : null}
        >
          +1
        </div>
        <div
          className="rounded px-2 bg-light-blue-bg cursor-pointer hover:bg-teal-light"
          onClick={() => (pickRadius > 1 ? setRadius(pickRadius - 1) : null)}
        >
          -1
        </div>
      </div>
    </div>
  );
}

export default StepRadius;
