import React from 'react'
import { Button, Icon } from 'UI'
import cn from 'classnames'
// import stl from './AassistActions.css'

interface Props {
  isLive: false;  
}

function AssistActions({ }: Props) {
  return (
    <div className="flex items-center">
      <div className={cn('cursor-pointer p-2 mr-2')}>
        <Icon name="telephone" size="20" />
      </div>
      <div className="flex items-center p-2 cursor-pointer">
          <Icon name="controller" size="20" />
          <span className="ml-2">Request Control</span>
        </div>
    </div>
  )
}

export default AssistActions
