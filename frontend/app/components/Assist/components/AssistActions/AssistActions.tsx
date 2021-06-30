import React from 'react'
import { Button, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { callPeer } from 'App/player';
import { toggleChatWindow } from 'Duck/sessions';
import stl from './AassistActions.css'

interface Props {
  isLive: false;
  toggleChatWindow: (state) => void
}

function AssistActions({ toggleChatWindow }: Props) {
  return (
    <div className="flex items-center">
      <div
        className={cn('cursor-pointer p-2 mr-2')}
        onClick={() => toggleChatWindow(true)}
      >
        <Icon name="telephone" size="20" />
      </div>
      <div className="mx-1" />
      <div className="flex items-center p-2 cursor-pointer">
        <Icon name="controller" size="20" />
        <span className="ml-2">Request Control</span>
      </div>
    </div>
  )
}

export default connect(null, { toggleChatWindow })(AssistActions)
