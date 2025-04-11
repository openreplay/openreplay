import { PlayPauseSessionShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import React from 'react';
import { Icon } from 'UI';
import { Popover } from 'antd';

export enum PlayingState {
  Playing,
  Paused,
  Completed,
}

interface IProps {
  togglePlay: () => void;
  iconSize: number;
  state: PlayingState;
}

const Values = {
  [PlayingState.Playing]: {
    icon: 'pause-fill' as const,
    label: 'Pause',
  },
  [PlayingState.Completed]: {
    icon: 'arrow-clockwise' as const,
    label: 'Replay this session',
  },
  [PlayingState.Paused]: {
    icon: 'play-fill-new' as const,
    label: 'Play',
  },
};

export function PlayButton({ togglePlay, iconSize, state }: IProps) {
  const { icon, label } = Values[state];

  return (
    <Popover
      content={
        <div className="flex gap-2 items-center">
          <PlayPauseSessionShortcut />
          <div>{label}</div>
        </div>
      }
    >
      <div
        onClick={togglePlay}
        className="hover-main color-main cursor-pointer rounded-full hover:bg-indigo-50"
      >
        <Icon name={icon} size={iconSize} color="inherit" />
      </div>
    </Popover>
  );
}
