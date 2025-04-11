import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import {Headset} from 'lucide-react';
import cn from 'classnames';
import {
  CallingState,
  ConnectionStatus,
  RemoteControlStatus,
  RequestLocalStream,
} from 'Player';
import type { LocalStream } from 'Player';
import {
  PlayerContext,
  ILivePlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { confirm, Icon, Tooltip } from 'UI';
import ScreenRecorder from 'App/components/Session_/ScreenRecorder/ScreenRecorder';
import { audioContextManager } from 'App/utils/screenRecorder';
import { useStore } from 'App/mstore';
import stl from './AassistActions.module.css';
import ChatWindow from '../../ChatWindow';
import { useTranslation } from 'react-i18next';

function onError(e: any) {
  console.log(e);
  toast.error(typeof e === 'string' ? e : e.message);
}

interface Props {
  userId: string;
  isCallActive: boolean;
  agentIds: string[];
  userDisplayName: string;
}

const AssistActionsPing = {
  control: {
    start: 's_control_started',
    end: 's_control_ended',
  },
  call: {
    start: 's_call_started',
    end: 's_call_ended',
  },
} as const;

function AssistActions({ userId, isCallActive, agentIds }: Props) {
  // @ts-ignore ???
  const { t } = useTranslation();
  const { player, store } = React.useContext<ILivePlayerContext>(PlayerContext);
  const { sessionStore, userStore } = useStore();
  const permissions = userStore.account.permissions || [];
  const hasPermission =
    permissions.includes('ASSIST_CALL') ||
    permissions.includes('SERVICE_ASSIST_CALL');
  const { isEnterprise } = userStore;
  const agentId = userStore.account.id;
  const { userDisplayName } = sessionStore.current;

  const {
    assistManager: {
      call: callPeer,
      setCallArgs,
      requestReleaseRemoteControl,
      toggleAnnotation,
      setRemoteControlCallbacks,
    },
    toggleUserName,
  } = player;
  const {
    calling,
    annotating,
    peerConnectionStatus,
    remoteControl: remoteControlStatus,
    livePlay,
  } = store.get();

  const [isPrestart, setPrestart] = useState(false);
  const [incomeStream, setIncomeStream] = useState<
    { stream: MediaStream; isAgent: boolean }[] | null
  >([]);
  const [localStream, setLocalStream] = useState<LocalStream | null>(null);
  const [callObject, setCallObject] = useState<{ end: () => void } | null | undefined>(
    null,
  );

  const onCall =
    calling === CallingState.OnCall || calling === CallingState.Reconnecting;
  const callRequesting = calling === CallingState.Connecting;
  const cannotCall =
    peerConnectionStatus !== ConnectionStatus.Connected ||
    (isEnterprise && !hasPermission);

  const remoteRequesting =
    remoteControlStatus === RemoteControlStatus.Requesting;
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
      // higher than waiting for messages
      if (peerConnectionStatus > 1) {
        toggleUserName();
      }
    }
  }, [remoteActive]);

  useEffect(() => callObject?.end(), []);

  useEffect(() => {
    if (peerConnectionStatus == ConnectionStatus.Disconnected) {
      toast.info(t('Live session was closed.'));
    }
  }, [peerConnectionStatus]);

  const addIncomeStream = (stream: MediaStream, isAgent: boolean) => {
    if (!stream.active) return;
    setIncomeStream((oldState) => {
      if (oldState === null) return [{ stream, isAgent }];
      if (
        !oldState.find(
          (existingStream) => existingStream.stream.id === stream.id,
        )
      ) {
        audioContextManager.mergeAudioStreams(stream);
        return [...oldState, { stream, isAgent }];
      }
      return oldState;
    });
  };

  const removeIncomeStream = () => {
    setIncomeStream([]);
  };

  function onReject() {
    toast.info(t('Call was rejected.'));
  }

  function onControlReject() {
    toast.info(t('Remote control request was rejected by user'));
  }

  function onControlBusy() {
    toast.info(t('Remote control busy'));
  }

  function call() {
    RequestLocalStream()
      .then((lStream) => {
        setLocalStream(lStream);
        audioContextManager.mergeAudioStreams(lStream.stream);
        setCallArgs(
          lStream,
          addIncomeStream,
          () => {
            player.assistManager.ping(AssistActionsPing.call.end, agentId);
            lStream.stop.apply(lStream);
            removeIncomeStream();
          },
          () => {
            player.assistManager.ping(AssistActionsPing.call.end, agentId);
            lStream.stop.apply(lStream);
            removeIncomeStream();
          },
          onReject,
          onError,
        );
        setCallObject(callPeer());
        // if (additionalAgentIds) {
        //   callPeer(additionalAgentIds);
        // }
      })
      .catch(onError);
  }

  const confirmCall = async () => {
    if (callRequesting || remoteRequesting) return;

    if (
      await confirm({
        header: t('Start Call'),
        confirmButton: t('Call'),
        confirmation: `${t('Are you sure you want to call')} ${userId || t('User')}?`,
      })
    ) {
      call(agentIds);
    }
  };

  const requestControl = () => {
    const onStart = () => {
      player.assistManager.ping(AssistActionsPing.control.start, agentId);
    };
    const onEnd = () => {
      player.assistManager.ping(AssistActionsPing.control.end, agentId);
    };
    setRemoteControlCallbacks({
      onReject: onControlReject,
      onStart,
      onEnd,
      onBusy: onControlBusy,
    });
    requestReleaseRemoteControl();
  };

  React.useEffect(() => {
    if (onCall) {
      player.assistManager.ping(AssistActionsPing.call.start, agentId);
    }
  }, [onCall]);

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
              icon={<Icon name={annotating ? 'pencil-stop' : 'pencil'} size={16} />}
              type={'text'}
              size='small'
              className={annotating ? 'text-red' : 'text-main'}
            >
              {t('Annotate')}
            </Button>
          </div>
          <div className={stl.divider} />
        </>
      )}

      {/* @ts-ignore wtf? */}
      <ScreenRecorder />

      {/* @ts-ignore */}
      <Tooltip title={t('Call user to initiate remote control')} disabled={livePlay}>
        <div
          className={cn('cursor-pointer p-2 flex items-center', {
            [stl.disabled]:
              cannotCall || !livePlay || callRequesting || remoteRequesting,
          })}
          onClick={requestControl}
          role="button"
        >
          <Button
            type={'text'}
            className={remoteActive ? 'text-red' : 'text-teal'}
            icon={<Icon name={remoteActive ? 'window-x' : 'remote-control'} size={16} color={remoteActive ? 'red' : 'main'} />}
            size='small'
          >
            {t('Remote Control')}
          </Button>
        </div>
      </Tooltip>

      <Tooltip
        title={
          cannotCall
            ? t("You don't have the permissions to perform this action.")
            : `${t('Call')} ${userId || t('User')}`
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
            icon={<Headset size={16} />}
            type={'text'}
            className={onCall ? 'text-red' : isPrestart ? 'text-green' : 'text-main'}
            size='small'
          >
            {onCall ? t('End') : isPrestart ? t('Join Call') : t('Call')}
          </Button>
        </div>
      </Tooltip>

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

export default observer(AssistActions);
