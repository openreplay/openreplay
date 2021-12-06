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
import { confirm } from 'UI/Confirmation';
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
  hasPermission: boolean,
  isEnterprise: boolean,
}

function AssistActions({ toggleChatWindow, userId, calling, peerConnectionStatus, remoteControlEnabled, hasPermission, isEnterprise }: Props) {
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

  const confirmCall =  async () => {
    if (await confirm({
      header: 'Start Call',
      confirmButton: 'Call',
      confirmation: `Are you sure you want to call ${userId ? userId : 'User'}?`
    })) {
      call()
    }
  }

  const inCall = calling !== CallingState.False;
  const cannotCall = (peerConnectionStatus !== ConnectionStatus.Connected) || (isEnterprise && !hasPermission)

  return (
    <div className="flex items-center">
      <Popup
        trigger={
          <div
            className={
              cn(
                'cursor-pointer p-2 mr-2 flex items-center',
                // {[stl.inCall] : inCall },
                {[stl.disabled]: cannotCall}
              )
            }
            onClick={ inCall ? callObject?.end : confirmCall}
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
        content={ cannotCall ? "You don’t have the permissions to perform this action." : `Call ${userId ? userId : 'User'}` }
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

const con = connect(state => {
  const permissions = state.getIn([ 'user', 'account', 'permissions' ]) || []
  return {
    hasPermission: permissions.includes('ASSIST_CALL'),
    isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
  }
}, { toggleChatWindow })

export default con(connectPlayer(state => ({
  calling: state.calling,
  remoteControlEnabled: state.remoteControl,
  peerConnectionStatus: state.peerConnectionStatus,
}))(AssistActions))
