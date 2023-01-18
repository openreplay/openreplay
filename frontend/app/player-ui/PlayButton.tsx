import React from 'react'
import { Icon, Tooltip } from "UI";

export enum PlayingState {
  Playing,
  Paused,
  Completed
}

interface IProps {
  togglePlay: () => void;
  iconSize: number;
  state: PlayingState;
}

const Values = {
  [PlayingState.Playing]: {
    icon: 'pause-fill' as const,
    label: 'Pause'
  },
  [PlayingState.Completed]: {
    icon: 'arrow-clockwise' as const,
    label: 'Replay this session',
  },
  [PlayingState.Paused]: {
    icon: 'play-fill-new' as const,
    label: 'Play'
  }
}

export function PlayButton({ togglePlay, iconSize, state }: IProps) {
  const { icon, label } = Values[state];

  return (
    <Tooltip title={label} className="mr-4">
      <div
        onClick={togglePlay}
        className="hover-main color-main cursor-pointer rounded hover:bg-gray-light-shade"
      >
        <Icon name={icon} size={iconSize} color="inherit" />
      </div>
    </Tooltip>
  )
}