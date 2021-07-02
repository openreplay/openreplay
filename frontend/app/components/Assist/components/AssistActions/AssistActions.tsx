import React from 'react'
import { Popup, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { toggleChatWindow } from 'Duck/sessions';
import stl from './AassistActions.css'

interface Props {
  isLive: false;
  toggleChatWindow: (state) => void
}

function AssistActions({ toggleChatWindow }: Props) {
  return (
    <div className="flex items-center">
      <Popup
        trigger={
          <div
            className={cn('cursor-pointer p-2 mr-2')}
            onClick={() => toggleChatWindow(true)}
            role="button"
          >
            <Icon name="telephone-fill" size="20" color="teal" />
          </div>
        }
        content={ `Start Video Call` }
        size="tiny"
        inverted
        position="top center"
      />
    </div>
  )
}

export default connect(null, { toggleChatWindow })(AssistActions)
