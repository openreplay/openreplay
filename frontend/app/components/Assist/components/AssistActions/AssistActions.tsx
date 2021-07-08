import React, { useState, useEffect } from 'react'
import { Popup, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { toggleChatWindow } from 'Duck/sessions';
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import { callPeer } from 'Player'
import { CallingState } from 'Player/MessageDistributor/managers/AssistManager';

interface Props {
  userId: String,
  toggleChatWindow: (state) => void,
  calling: CallingState
}

function AssistActions({ toggleChatWindow, userId, calling }: Props) {
  const [showChat, setShowChat] = useState(false)
  const [ incomeStream, setIncomeStream ] = useState<MediaStream | null>(null);
  const [ localStream, setLocalStream ] = useState<MediaStream | null>(null);
  const [ endCall, setEndCall ] = useState<()=>void>(()=>{});

  useEffect(() => {
    return endCall
  }, [])

  function onClose(stream) {    
    stream.getTracks().forEach(t=>t.stop());
  }
  function onReject() {
    console.log("Rejected");
  }
  function onError() {
    console.log("Something went wrong");
  }

  function call() { 
    navigator.mediaDevices.getUserMedia({video:true, audio:true})
      .then(lStream => {
        setLocalStream(lStream);
        setEndCall(() => callPeer(
          lStream,
          setIncomeStream,
          onClose.bind(null, lStream),
          onReject,
          onError
        ));
      }).catch(onError);
  }

  const inCall = calling == 0 || calling == 1

  return (
    <div className="flex items-center">
      <Popup
        trigger={
          <div
            className={cn('cursor-pointer p-2 mr-2 flex items-center')}
            onClick={inCall ? endCall : call}
            role="button"
          >
            <Icon
              name="headset"
              size="20"
              color={ inCall ? "red" : "gray-darkest" }
            />
            <span className={cn("ml-2", { 'red' : inCall })}>{ inCall ? 'End Meeting' : 'Start Meeting' }</span>
          </div>
        }
        content={ `Call ${userId}` }
        size="tiny"
        inverted
        position="top right"
      />
      <div className="fixed ml-3 left-0 top-0" style={{ zIndex: 999 }}>
        { inCall && <ChatWindow endCall={endCall} userId={userId} incomeStream={incomeStream} localStream={localStream} /> }
      </div>
    </div>
  )
}

const con = connect(null, { toggleChatWindow })

export default con(connectPlayer(state => ({
  calling: state.calling
}))(AssistActions))
