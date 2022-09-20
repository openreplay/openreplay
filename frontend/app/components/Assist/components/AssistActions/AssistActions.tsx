import React, { useState, useEffect } from 'react';
import { Popup, Button } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import { toggleChatWindow } from 'Duck/sessions';
import { connectPlayer } from 'Player/store';
import ChatWindow from '../../ChatWindow';
import {
  callPeer,
  setCallArgs,
  requestReleaseRemoteControl,
  toggleAnnotation,
  toggleUserName,
} from 'Player';
import {
  CallingState,
  ConnectionStatus,
  RemoteControlStatus,
} from 'Player/MessageDistributor/managers/AssistManager';
import RequestLocalStream from 'Player/MessageDistributor/managers/LocalStream';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';
import { Tooltip } from 'react-tippy';
import { toast } from 'react-toastify';
import { confirm } from 'UI';
import stl from './AassistActions.module.css';

function onReject() {
  toast.info(`Call was rejected.`);
}

function onError(e: any) {
  console.log(e);
  toast.error(typeof e === 'string' ? e : e.message);
}

interface Props {
  userId: string;
  calling: CallingState;
  annotating: boolean;
  peerConnectionStatus: ConnectionStatus;
  remoteControlStatus: RemoteControlStatus;
  hasPermission: boolean;
  isEnterprise: boolean;
  isCallActive: boolean;
  agentIds: string[];
  livePlay: boolean;
  userDisplayName: string;
}

function AssistActions({
  userId,
  calling,
  annotating,
  peerConnectionStatus,
  remoteControlStatus,
  hasPermission,
  isEnterprise,
  isCallActive,
  agentIds,
  livePlay,
  userDisplayName,
}: Props) {
  const [isPrestart, setPrestart] = useState(false);
  const [incomeStream, setIncomeStream] = useState<MediaStream[] | null>([]);
  const [localStream, setLocalStream] = useState<LocalStream | null>(null);
  const [callObject, setCallObject] = useState<{ end: () => void } | null>(null);

  const onCall = calling === CallingState.OnCall || calling === CallingState.Reconnecting;
  const callRequesting = calling === CallingState.Connecting;
  const cannotCall =
    peerConnectionStatus !== ConnectionStatus.Connected || (isEnterprise && !hasPermission);

  const remoteRequesting = remoteControlStatus === RemoteControlStatus.Requesting;
  const remoteActive = remoteControlStatus === RemoteControlStatus.Enabled;

  useEffect(() => {
    if (!onCall && isCallActive && agentIds) {
      setPrestart(true);
      // call(agentIds); do not autocall on prestart, can change later
    }
  }, [agentIds, isCallActive]);

  useEffect(() => {
    if (!livePlay) {
      if (annotating) {
        toggleAnnotation(false);
      }
      if (remoteActive) {
        requestReleaseRemoteControl();
      }
    }
  }, [livePlay]);

  useEffect(() => {
    if (remoteActive) {
      toggleUserName(userDisplayName);
    } else {
      toggleUserName();
    }
  }, [remoteActive]);

  useEffect(() => {
    return callObject?.end();
  }, []);

  useEffect(() => {
    if (peerConnectionStatus == ConnectionStatus.Disconnected) {
      toast.info(`Live session was closed.`);
    }
  }, [peerConnectionStatus]);

  const addIncomeStream = (stream: MediaStream) => {
    setIncomeStream((oldState) => {
      if (!oldState.find((existingStream) => existingStream.id === stream.id)) {
        return [...oldState, stream];
      }
      return oldState;
    });
  };

  function call(additionalAgentIds?: string[]) {
    RequestLocalStream()
      .then((lStream) => {
        setLocalStream(lStream);
        setCallArgs(lStream, addIncomeStream, lStream.stop.bind(lStream), onReject, onError);
        setCallObject(callPeer());
        if (additionalAgentIds) {
          callPeer(additionalAgentIds);
        }
      })
      .catch(onError);
  }

  const confirmCall = async () => {
    if (callRequesting || remoteRequesting) return;

    if (
      await confirm({
        header: 'Start Call',
        confirmButton: 'Call',
        confirmation: `Are you sure you want to call ${userId ? userId : 'User'}?`,
      })
    ) {
      call(agentIds);
    }
  };

  const requestControl = () => {
    if (callRequesting || remoteRequesting) return;
    requestReleaseRemoteControl();
  };

  return (
    <div className="flex items-center">
      {(onCall || remoteActive) && (
        <>
          <div
            className={cn('cursor-pointer p-2 flex items-center', {
              [stl.disabled]: cannotCall || !livePlay,
            })}
            onClick={() => toggleAnnotation(!annotating)}
            role="button"
          >
            <Button
              icon={annotating ? 'pencil-stop' : 'pencil'}
              variant={annotating ? 'text-red' : 'text-primary'}
              style={{ height: '28px' }}
            >
              Annotate
            </Button>
          </div>
          <div className={stl.divider} />
        </>
      )}

      {/* @ts-ignore */}
      <Tooltip title="Go live to initiate remote control" disabled={livePlay}>
        <div
          className={cn('cursor-pointer p-2 flex items-center', {
            [stl.disabled]: cannotCall || !livePlay || callRequesting || remoteRequesting,
          })}
          onClick={requestControl}
          role="button"
        >
          <Button
            icon={remoteActive ? 'window-x' : 'remote-control'}
            variant={remoteActive ? 'text-red' : 'text-primary'}
            style={{ height: '28px' }}
          >
            Remote Control
          </Button>
        </div>
      </Tooltip>
      <div className={stl.divider} />

      <Popup
        content={
          cannotCall
            ? `You don't have the permissions to perform this action.`
            : `Call ${userId ? userId : 'User'}`
        }
        disabled={onCall}
      >
        <div
          className={cn('cursor-pointer p-2 flex items-center', {
            [stl.disabled]: cannotCall || callRequesting || remoteRequesting,
          })}
          onClick={onCall ? callObject?.end : confirmCall}
          role="button"
        >
          <Button
            icon="headset"
            variant={onCall ? 'text-red' : isPrestart ? 'green' : 'primary'}
            style={{ height: '28px' }}
          >
            {onCall ? 'End' : isPrestart ? 'Join Call' : 'Call'}
          </Button>
        </div>
      </Popup>

      <div className="fixed ml-3 left-0 top-0" style={{ zIndex: 999 }}>
        {onCall && callObject && (
          <ChatWindow
            endCall={callObject.end}
            userId={userId}
            incomeStream={incomeStream}
            localStream={localStream}
            isPrestart={isPrestart}
          />
        )}
      </div>
    </div>
  );
}

const con = connect(
  (state) => {
    const permissions = state.getIn(['user', 'account', 'permissions']) || [];
    return {
      hasPermission: permissions.includes('ASSIST_CALL'),
      isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
      userDisplayName: state.getIn(['sessions', 'current', 'userDisplayName']),
    };
  },
  { toggleChatWindow }
);

export default con(
  connectPlayer((state) => ({
    calling: state.calling,
    annotating: state.annotating,
    remoteControlStatus: state.remoteControl,
    peerConnectionStatus: state.peerConnectionStatus,
    livePlay: state.livePlay,
  }))(AssistActions)
);
