import React from 'react';
import type { MarkedTarget } from 'Player';
import cn from 'classnames';
import stl from './Marker.module.css';
import { activeTarget } from 'Player';
import { Tooltip } from 'UI';

interface Props {
  target: MarkedTarget;
  active: boolean;
}

export default function Marker({ target, active }: Props) {
  const style = {
    top: `${target.boundingRect.top}px`,
    left: `${target.boundingRect.left}px`,
    width: `${target.boundingRect.width}px`,
    height: `${target.boundingRect.height}px`,
  };
  return (
    <div
      className={cn(stl.marker, { [stl.active]: active })}
      style={style}
      onClick={() => activeTarget(target.index)}
    >
      <div className={stl.index}>{target.index + 1}</div>
      <Tooltip open={active} delay={0} title={<div>{target.count} Clicks</div>}>
        <div className="absolute inset-0"></div>
      </Tooltip>
    </div>
  );
}
