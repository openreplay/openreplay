import React from 'react'
import { Icon } from 'UI'
import stl from './LiveTag.module.css'

interface Props {
  onClick: () => void,
  isLive: Boolean
}

function LiveTag({ isLive, onClick }: Props) {
  return (
    <button onClick={ onClick } className={ stl.liveTag } data-is-live={ isLive }>
      <Icon name="circle" size="8" marginRight={5} color="white" />
      <div>{isLive ? 'Live' : 'Go live'}</div>
    </button>
  )
}

export default LiveTag
