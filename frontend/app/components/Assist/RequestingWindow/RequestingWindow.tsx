import React from 'react';
import { INDEXES } from 'App/constants/zindex';
import { connect } from 'react-redux';
import { Button, Loader, Icon } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';

interface Props {
  userDisplayName: string;
  getWindowType: () => WindowType | null;
}

export enum WindowType {
  Call,
  Control,
  Record,
}

enum Actions {
  CallEnd,
  ControlEnd,
  RecordingEnd,
}

const WIN_VARIANTS = {
  [WindowType.Call]: {
    text: 'to accept the call',
    icon: 'call' as const,
    action: Actions.CallEnd,
    iconColor: 'teal',
  },
  [WindowType.Control]: {
    text: 'to accept remote control request',
    icon: 'remote-control' as const,
    action: Actions.ControlEnd,
    iconColor: 'teal',
  },
  [WindowType.Record]: {
    text: 'to accept recording request',
    icon: 'record-circle' as const,
    iconColor: 'red',
    action: Actions.RecordingEnd,
  }
};

function RequestingWindow({ userDisplayName, getWindowType }: Props) {
  const windowType = getWindowType()
  if (!windowType) return;
  const { player } = React.useContext(PlayerContext)


  const {
    assistManager: {
      initiateCallEnd,
      releaseRemoteControl,
      stopRecording,
    }
  } = player

  const actions = {
    [Actions.CallEnd]: initiateCallEnd,
    [Actions.ControlEnd]: releaseRemoteControl,
    [Actions.RecordingEnd]: stopRecording,
  }
  return (
    <div
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0, 0.30)', zIndex: INDEXES.PLAYER_REQUEST_WINDOW }}
    >
      <div className="rounded bg-white pt-4 pb-2 px-8 flex flex-col text-lg items-center max-w-lg text-center">
        <Icon size={40} color={WIN_VARIANTS[windowType].iconColor} name={WIN_VARIANTS[windowType].icon} className="mb-4" />
        <div>
          Waiting for <span className="font-semibold">{userDisplayName}</span>
        </div>
        <span>{WIN_VARIANTS[windowType].text}</span>
        <Loader size={30} style={{ minHeight: 60 }} />
        <Button variant="text-primary" onClick={actions[WIN_VARIANTS[windowType].action]}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default connect((state: any) => ({
  userDisplayName: state.getIn(['sessions', 'current']).userDisplayName,
}))(RequestingWindow);
