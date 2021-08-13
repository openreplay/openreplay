import React, { useState, useEffect } from 'react'
import { Popup, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { toggleChatWindow } from 'Duck/sessions';
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import { callPeer } from 'Player'
import { CallingState, ConnectionStatus } from 'Player/MessageDistributor/managers/AssistManager';
import { toast } from 'react-toastify';
import stl from './AassistActions.css'

interface Props {
  userId: String,
  toggleChatWindow: (state) => void,
  calling: CallingState,
  peerConnectionStatus: ConnectionStatus
}

function AssistActions({ toggleChatWindow, userId, calling, peerConnectionStatus }: Props) {  
  const [ incomeStream, setIncomeStream ] = useState<MediaStream | null>(null);
  const [ localStream, setLocalStream ] = useState<MediaStream | null>(null);
  const [ endCall, setEndCall ] = useState<()=>void>(()=>{});

  useEffect(() => {
    return endCall
  }, [])

  useEffect(() => {
    if (peerConnectionStatus == ConnectionStatus.Disconnected) {
      toast.info(`Live session was closed.`);
    }    
  }, [peerConnectionStatus])

  function onClose(stream) {    
    stream.getTracks().forEach(t=>t.stop());    
  }

  function onReject() {
    toast.info(`Call was rejected.`);
  }
  
  function onError(e) {
    toast.error(e);
  }

  function onCallConnect(lStream) {
    setLocalStream(lStream);
    setEndCall(() => callPeer(
      lStream,
      setIncomeStream,
      onClose.bind(null, lStream),
      onReject,
      onError
    ));
  }

  function call() {
    navigator.mediaDevices.getUserMedia({video:true, audio:true})
      .then(onCallConnect).catch(error => {
        onError(error)

        navigator.mediaDevices.getUserMedia({audio:true})
          .then(onCallConnect)
          .catch(onError)
      });
  }

  const inCall = calling !== CallingState.False;

  return (
    <div className="flex items-center">
      <Popup
        trigger={
          <div
            className={
              cn(
                'cursor-pointer p-2 mr-2 flex items-center',
                {[stl.inCall] : inCall },
                {[stl.disabled]: peerConnectionStatus !== ConnectionStatus.Connected}
              )
            }
            onClick={ inCall ? endCall : call}
            role="button"
          >
            <Icon
              name="headset"
              size="20"
              color={ inCall ? "red" : "gray-darkest" }
            />
            <span className={cn("ml-2", { 'text-red' : inCall })}>{ inCall ? 'End Call' : 'Call' }</span>
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
  calling: state.calling,
  peerConnectionStatus: state.peerConnectionStatus,
}))(AssistActions))
