import React, { useState } from 'react'
import stl from './SelectorCard.css'
import cn from 'classnames';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';
import { activeTarget } from 'Player';

interface Props {
  index?: number,
  target: MarkedTarget,
  showContent: boolean
}

export default function SelectorCard({ index = 1, target, showContent } : Props) {
  return (
    <div className={cn(stl.wrapper, { [stl.active]: showContent })}>
      <div className={stl.top} onClick={() => activeTarget(index)}>
        <div className={stl.index}>{index + 1}</div>
        <div className="truncate">{target.selector}</div>
      </div>
      { showContent && (
        <div className={stl.counts}>
          <div>{target.count} Clicks - {target.percent}%</div>
          <div className="color-gray-medium">TOTAL CLICKS</div>
        </div>
      ) }      
    </div>
  )
}
