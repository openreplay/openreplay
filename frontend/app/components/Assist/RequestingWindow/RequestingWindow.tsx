import React from 'react';
import { INDEXES } from 'App/constants/zindex';
import { Loader, Icon } from 'UI';
import { Button } from 'antd';
import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

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

const WIN_VARIANTS = (t: TFunction) => ({
  [WindowType.Call]: {
    text: t('to accept the call'),
    icon: 'call' as const,
    action: Actions.CallEnd,
    iconColor: 'teal',
  },
  [WindowType.Control]: {
    text: t('to accept remote control request'),
    icon: 'remote-control' as const,
    action: Actions.ControlEnd,
    iconColor: 'teal',
  },
  [WindowType.Record]: {
    text: t('to accept recording request'),
    icon: 'record-circle' as const,
    iconColor: 'red',
    action: Actions.RecordingEnd,
  },
});

function RequestingWindow({ getWindowType }: Props) {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { userDisplayName } = sessionStore.current;
  const windowType = getWindowType();
  if (!windowType) return;
  const { player } = React.useContext(PlayerContext);

  const {
    assistManager: { initiateCallEnd, releaseRemoteControl, stopRecording },
  } = player;

  const actions = {
    [Actions.CallEnd]: initiateCallEnd,
    [Actions.ControlEnd]: releaseRemoteControl,
    [Actions.RecordingEnd]: stopRecording,
  };
  return (
    <div
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0, 0.30)',
        zIndex: INDEXES.PLAYER_REQUEST_WINDOW,
      }}
    >
      <div className="rounded bg-white pt-4 pb-2 px-8 flex flex-col text-lg items-center max-w-lg text-center">
        <Icon
          size={40}
          color={WIN_VARIANTS(t)[windowType].iconColor}
          name={WIN_VARIANTS(t)[windowType].icon}
          className="mb-4"
        />
        <div>
          {t('Waiting for')}{' '}
          <span className="font-semibold">{userDisplayName}</span>
        </div>
        <span>{WIN_VARIANTS(t)[windowType].text}</span>
        <Loader size={30} style={{ minHeight: 60 }} />
        <Button
          variant="text"
          onClick={actions[WIN_VARIANTS(t)[windowType].action]}
        >
          {t('Cancel')}
        </Button>
      </div>
    </div>
  );
}

export default observer(RequestingWindow);
