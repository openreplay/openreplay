import React, { useState, useEffect } from 'react'
import { Popup, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { toggleChatWindow } from 'Duck/sessions';
import stl from './AassistActions.css'
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import { callPeer } from 'App/player'
import { CallingState } from 'Player/MessageDistributor/managers/AssistManager';

interface Props {
  userId: String,
  toggleChatWindow: (state) => void,
  calling: CallingState
}

function AssistActions({ toggleChatWindow, userId, calling }: Props) {
  const [showChat, setShowChat] = useState(false)
  const [ callBtnAction, setCallBtnAction ] = useState(()=>{});
  const [ inputStream, setInputStream ] = useState<MediaStream | null>(null);
  const [ outputStream, setOutputStream ] = useState<MediaStream | null>(null);

  function onClose(stream) {
    stream.getTracks().forEach(t => t.stop());
  }

  function onReject() {
    console.log("Rejected");
  }

  function onError() {
    console.log("Something went wrong");
  }

  const endCall = () => {

  }

  const startCall = () => {
    navigator.mediaDevices.getUserMedia({video:true, audio:true})
      .then(lStream => {
        setOutputStream(lStream);
        setCallBtnAction(
          callPeer(
            lStream,
            inputStream,
            onClose.bind(null, lStream),
            onReject,
            onError
          )
        );
      }).catch(onError);
    
    setShowChat(!showChat)
  }

  const inCall = calling == CallingState.Requesting || CallingState.True

  return (
    <div className="flex items-center">
      <Popup
        trigger={
          <div
            className={cn('cursor-pointer p-2 mr-2')}
            onClick={startCall}
            role="button"
          >
            <Icon
              name="telephone-fill"
              size="20"
              color={ calling == CallingState.Requesting ? "red" : "teal" }
            />
          </div>
        }
        content={ `Call ${userId}` }
        size="tiny"
        inverted
        position="top right"
      />
      <div className="fixed ml-3 left-0 top-0 z-50">
        { showChat && <ChatWindow inputStream={inputStream} outputStream={outputStream} /> }
      </div>
    </div>
  )
}

const con = connect(null, { toggleChatWindow })

export default con(connectPlayer(state => ({
  calling: state.calling
}))(AssistActions))
