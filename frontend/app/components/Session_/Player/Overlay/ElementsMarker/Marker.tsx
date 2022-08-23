//@ts-nocheck
import React from 'react';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';
import cn from 'classnames';
import stl from './Marker.module.css';
import { activeTarget } from 'Player';
import { Tooltip } from 'react-tippy';

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
  }
  return (
    <div className={cn(stl.marker, { [stl.active]: active })} style={style} onClick={() => activeTarget(target.index)}>
      <div className={stl.index}>{target.index + 1}</div>
      {/* @ts-expect-error Tooltip doesn't have children property */}
      <Tooltip
        open={active}
        arrow
        sticky
        distance={15}
        html={(
          <div>{target.count} Clicks</div>
        )}
        trigger="mouseenter"
      >
        <div className="absolute inset-0"></div>
      </Tooltip>
    </div>
  )
}