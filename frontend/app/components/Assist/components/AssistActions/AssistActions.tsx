import React, { useState, useEffect } from 'react'
import { Popup, Icon } from 'UI'
import { connect } from 'react-redux'
import cn from 'classnames'
import { toggleChatWindow } from 'Duck/sessions';
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import { callPeer } from 'Player'
import { CallingState, ConnectionStatus } from 'Player/MessageDistributor/managers/AssistManager';
import RequestLocalStream from 'Player/MessageDistributor/managers/LocalStream';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';

import { toast } from 'react-toastify';
import stl from './AassistActions.css'

function onClose(stream) {
  stream.getTracks().forEach(t=>t.stop());
}

function onReject() {
  toast.info(`Call was rejected.`);
}

function onError(e) {
  toast.error(e);
}


interface Props {
  userId: String,
  toggleChatWindow: (state) => void,
  calling: CallingState,
  peerConnectionStatus: ConnectionStatus,
  remoteControlEnabled: boolean,
}

function AssistActions({ toggleChatWindow, userId, calling, peerConnectionStatus, remoteControlEnabled }: Props) {  
  const [ incomeStream, setIncomeStream ] = useState<MediaStream | null>(null);
  const [ localStream, setLocalStream ] = useState<LocalStream | null>(null);
  const [ callObject, setCallObject ] = useState<{ end: ()=>void, toggleRemoteControl: ()=>void } | null >(null);

  useEffect(() => {
    return callObject?.end()
  }, [])

  useEffect(() => {
    if (peerConnectionStatus == ConnectionStatus.Disconnected) {
      toast.info(`Live session was closed.`);
    }    
  }, [peerConnectionStatus])


  function call() {
    RequestLocalStream().then(lStream => {
      setLocalStream(lStream);
      setCallObject(callPeer(
        lStream,
        setIncomeStream,
        lStream.stop.bind(lStream),
        onReject,
        onError
      ));
    }).catch(onError)
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
            onClick={ inCall ? callObject?.end : call}
            role="button"
          >
            <Icon
              name="headset"
              size="20"
              color={ inCall ? "red" : "gray-darkest" }
            />
            <span className={cn("ml-2", { 'color-red' : inCall })}>{ inCall ? 'End Call' : 'Call' }</span>
          </div>
        }
        content={ `Call ${userId}` }
        size="tiny"
        inverted
        position="top right"
      />
      { calling === CallingState.True &&
        <div
          className={
            cn(
              'cursor-pointer p-2 mr-2 flex items-center',
            )
          }
          onClick={ callObject?.toggleRemoteControl }
          role="button"
        >
          <Icon
            name="remote-control"
            size="20"
            color={ remoteControlEnabled ? "green" : "gray-darkest"}
          />
          <span className={cn("ml-2", { 'color-green' : remoteControlEnabled })}>{ 'Remote Control' }</span>
        </div>
      }
      <div className="fixed ml-3 left-0 top-0" style={{ zIndex: 999 }}>
        { inCall && callObject && <ChatWindow endCall={callObject.end} userId={userId} incomeStream={incomeStream} localStream={localStream} /> }
      </div>
    </div>
  )
}

const con = connect(null, { toggleChatWindow })

export default con(connectPlayer(state => ({
  calling: state.calling,
  remoteControlEnabled: state.remoteControl,
  peerConnectionStatus: state.peerConnectionStatus,
}))(AssistActions))
