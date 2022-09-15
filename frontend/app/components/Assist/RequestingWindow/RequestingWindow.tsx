import React from 'react'
import { INDEXES } from 'App/constants/zindex'
import { connect } from 'react-redux';
import { Button, Loader, Icon } from 'UI'
import { initiateCallEnd } from 'Player';

interface Props {
  userDisplayName: string
}

function RequestingWindow({ userDisplayName }: Props) {

  return (
    <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center" style={{ background: "rgba(0,0,0, 0.30)", zIndex: INDEXES.PLAYER_REQUEST_WINDOW}}>
      <div className="rounded bg-white py-4 px-8 flex flex-col text-lg items-center max-w-md text-center">
          <Icon size={40} name="call" className='mb-4'/>
          <span>Waiting for</span>
          <span className="font-semibold">{userDisplayName}</span>
          <span>to accept the call</span>
          <Loader size={30} style={{ minHeight: 60 }} />
        <Button variant="text-primary" onClick={initiateCallEnd}>cancel</Button>
      </div>
    </div>
  )
}

export default connect((state) => ({ userDisplayName: state.getIn(['sessions', 'current', 'userDisplayName']) }))(RequestingWindow)
