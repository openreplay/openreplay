import { Button } from '@/ui/actions/button';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { toast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  CallingState,
  ConnectionStatus,
  RemoteControlStatus,
  RequestLocalStream,
} from 'Player';
import type { LocalStream } from 'Player';
import {
  Headset,
  MonitorUp,
  MonitorX,
  Pencil,
  PencilOff,
  PhoneOff,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import ScreenRecorder from 'App/components/Session_/ScreenRecorder/ScreenRecorder';
import { useStore } from 'App/mstore';
import { audioContextManager } from 'App/utils/screenRecorder';

import ChatWindow from '../../ChatWindow';

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
  const [callObject, setCallObject] = useState<
    { end: () => void } | null | undefined
  >(null);

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

  const [confirming, setConfirming] = useState(false);
  const confirmCall = () => {
    if (callRequesting || remoteRequesting) return;
    setConfirming(true);
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

  const controlDisabled =
    cannotCall || !livePlay || callRequesting || remoteRequesting;
  const callDisabled = cannotCall || callRequesting || remoteRequesting;

  return (
    <>
      {(onCall || remoteActive) && (
        <Tooltip
          title={
            annotating
              ? t('Stop annotating')
              : t("Draw on the visitor's screen")
          }
        >
          <Button
            className={`m-rs__assist${annotating ? ' is-on' : ''}`}
            aria-pressed={annotating}
            disabled={cannotCall || !livePlay}
            onClick={() => toggleAnnotation(!annotating)}
          >
            {annotating ? <PencilOff size={13} /> : <Pencil size={13} />}
            {t('Annotate')}
          </Button>
        </Tooltip>
      )}

      {/* @ts-ignore */}
      <ScreenRecorder />

      <Tooltip
        title={
          livePlay
            ? remoteActive
              ? t('Give control back')
              : t("Take control of the visitor's screen")
            : t('Call user to initiate remote control')
        }
      >
        <span>
          <Button
            className={`m-rs__assist${remoteActive ? ' is-on' : ''}`}
            aria-pressed={remoteActive}
            disabled={controlDisabled}
            onClick={requestControl}
          >
            {remoteActive ? <MonitorX size={13} /> : <MonitorUp size={13} />}
            {remoteActive ? t('Stop control') : t('Remote control')}
          </Button>
        </span>
      </Tooltip>

      <Tooltip
        title={
          onCall
            ? undefined
            : cannotCall
              ? t("You don't have the permissions to perform this action.")
              : `${t('Call')} ${userId || t('User')}`
        }
      >
        <span>
          {onCall ? (
            <Button variant="danger" onClick={() => callObject?.end()}>
              <PhoneOff size={13} />
              {t('End')}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={callDisabled}
              onClick={confirmCall}
            >
              <Headset size={13} />
              {isPrestart ? t('Join call') : t('Call')}
            </Button>
          )}
        </span>
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

      <ConfirmDialog
        open={confirming}
        title={t('Start call?')}
        okText={t('Call')}
        danger={false}
        onCancel={() => setConfirming(false)}
        onOk={() => {
          setConfirming(false);
          call();
        }}
      >
        {t(
          'Call {{user}}? Their browser rings, and they choose whether to pick up.',
          { user: userId || t('User') },
        )}
      </ConfirmDialog>
    </>
  );
}

export default observer(AssistActions);
