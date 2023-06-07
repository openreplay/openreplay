import React from 'react';
import {
  SessionRecordingStatus,
  getStatusText,
  CallingState,
  ConnectionStatus,
  RemoteControlStatus,
} from 'Player';

import LiveStatusText from './LiveStatusText';
import Loader from 'Components/Session_/Player/Overlay/Loader';
import RequestingWindow, { WindowType } from 'App/components/Assist/RequestingWindow';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface Props {
  closedLive?: boolean,
}

function Overlay({
  closedLive,
}: Props) {
  // @ts-ignore ?? TODO
  const { store } = React.useContext<ILivePlayerContext>(PlayerContext)

  const {
    messagesLoading,
    peerConnectionStatus,
    livePlay,
    calling,
    remoteControl,
    recordingState,
    tabStates,
    currentTab
  } = store.get()

  const cssLoading = tabStates[currentTab]?.cssLoading || false
  const loading = messagesLoading || cssLoading
  const liveStatusText = getStatusText(peerConnectionStatus)
  const connectionStatus = peerConnectionStatus

  const showLiveStatusText = livePlay && liveStatusText && !loading;

  const showRequestWindow =
    (calling === CallingState.Connecting ||
      remoteControl === RemoteControlStatus.Requesting ||
      recordingState === SessionRecordingStatus.Requesting);

  const getRequestWindowType = () => {
    if (calling === CallingState.Connecting) {
      return WindowType.Call
    }
    if (remoteControl === RemoteControlStatus.Requesting) {
      return WindowType.Control
    }
    if (recordingState === SessionRecordingStatus.Requesting) {
      return WindowType.Record
    }

    return null;
  }

  return (
    <>
      {/* @ts-ignore wtf */}
      {showRequestWindow ? <RequestingWindow getWindowType={getRequestWindowType} /> : null}
      {showLiveStatusText && (
        <LiveStatusText
          connectionStatus={closedLive ? ConnectionStatus.Closed : connectionStatus}
        />
      )}
      {loading ? <Loader /> : null}
    </>
  );
}

export default observer(Overlay);
