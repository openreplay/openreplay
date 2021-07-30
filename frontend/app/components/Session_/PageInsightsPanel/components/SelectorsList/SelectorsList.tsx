import React, { useState }  from 'react'
import { NoContent } from 'UI'
import { connectPlayer } from 'Player/store';
import SelectorCard from '../SelectorCard/SelectorCard';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';

interface Props {
  targets: Array<MarkedTarget>,
  activeTargetIndex: number
}

function SelectorsList({ targets, activeTargetIndex }: Props) {     
  return (
    <div>
      <NoContent
        title="No data available."
        size="small"
        show={ targets && targets.length === 0 }
      >
        { targets && targets.map((target, index) => (
          <SelectorCard target={target} index={index} showContent={activeTargetIndex === index} />
        ))}
      </NoContent>
    </div>
  )
}


export default connectPlayer(state => ({
  targets: state.markedTargets,
  activeTargetIndex: state.activeTargetIndex,
}))(SelectorsList)
