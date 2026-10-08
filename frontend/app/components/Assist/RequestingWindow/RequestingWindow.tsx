import { Button } from '@/ui/actions/button';
import { BrandMark } from '@/ui/brand/BrandMark';
import { Icon } from '@/ui/icons/Icon';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { INDEXES } from 'App/constants/zindex';
import { useStore } from 'App/mstore';

interface Props {
  getWindowType: () => WindowType | null;
}

export enum WindowType {
  Call,
  Control,
  Record,
  SessionConfirm,
}

enum Actions {
  CallEnd,
  ControlEnd,
  RecordingEnd,
  None,
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
  [WindowType.SessionConfirm]: {
    text: t('to allow viewing this session'),
    icon: 'eye' as const,
    iconColor: 'teal',
    action: Actions.None,
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
    // @ts-ignore is in assist
    assistManager: { initiateCallEnd, releaseRemoteControl, stopRecording },
  } = player;

  const actions = {
    [Actions.CallEnd]: initiateCallEnd,
    [Actions.ControlEnd]: releaseRemoteControl,
    [Actions.RecordingEnd]: stopRecording,
    [Actions.None]: undefined,
  };
  return (
    <div
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center"
      style={{
        background: 'var(--m-scrim)',
        zIndex: INDEXES.PLAYER_REQUEST_WINDOW,
      }}
    >
      <div className="m-elevated flex max-w-md flex-col items-center gap-3 rounded-surface border border-border-subtle bg-surface-raised px-8 py-6 text-center">
        <Icon
          size={32}
          color={WIN_VARIANTS(t)[windowType].iconColor}
          name={WIN_VARIANTS(t)[windowType].icon}
        />
        <p className="text-md text-content-primary">
          {t('Waiting for')}{' '}
          <span className="font-medium">{userDisplayName}</span>{' '}
          {WIN_VARIANTS(t)[windowType].text}
        </p>
        <BrandMark loop size={28} />
        {actions[WIN_VARIANTS(t)[windowType].action] ? (
          <Button
            variant="subtle"
            onClick={actions[WIN_VARIANTS(t)[windowType].action]}
          >
            {t('Cancel')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default observer(RequestingWindow);
