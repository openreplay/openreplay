import React from 'react';
import { INDEXES } from 'App/constants/zindex';
import { connect } from 'react-redux';
import { Button, Loader, Icon } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';

interface Props {
  userDisplayName: string;
  type: WindowType;
}

export enum WindowType {
  Call,
  Control,
}

enum Actions {
  CallEnd,
  ControlEnd
}

const WIN_VARIANTS = {
  [WindowType.Call]: {
    text: 'to accept the call',
    icon: 'call' as const,
    action: Actions.CallEnd,
  },
  [WindowType.Control]: {
    text: 'to accept remote control request',
    icon: 'remote-control' as const,
    action: Actions.ControlEnd,
  },
};

function RequestingWindow({ userDisplayName, type }: Props) {
  const { player } = React.useContext(PlayerContext)

  const {
    assistManager: {
      initiateCallEnd,
      releaseRemoteControl,
    }
  } = player

  const actions = {
    [Actions.CallEnd]: initiateCallEnd,
    [Actions.ControlEnd]: releaseRemoteControl
  }
  return (
    <div
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0, 0.30)', zIndex: INDEXES.PLAYER_REQUEST_WINDOW }}
    >
      <div className="rounded bg-white pt-4 pb-2 px-8 flex flex-col text-lg items-center max-w-lg text-center">
        <Icon size={40} color="teal" name={WIN_VARIANTS[type].icon} className="mb-4" />
        <div>
          Waiting for <span className="font-semibold">{userDisplayName}</span>
        </div>
        <span>{WIN_VARIANTS[type].text}</span>
        <Loader size={30} style={{ minHeight: 60 }} />
        <Button variant="text-primary" onClick={actions[WIN_VARIANTS[type].action]}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default connect((state: any) => ({
  userDisplayName: state.getIn(['sessions', 'current', 'userDisplayName']),
}))(RequestingWindow);
