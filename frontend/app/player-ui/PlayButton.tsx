import { Tooltip } from '@/ui/overlays/tooltip';
import { Pause, Play, RotateCw } from 'lucide-react';
import React from 'react';

import { PlayPauseSessionShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';

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

// lucide, not <Icon>: the legacy set loads all 499 glyphs (~200KB gz) for one
const Values = {
  [PlayingState.Playing]: { Glyph: Pause, filled: true, label: 'Pause' },
  [PlayingState.Completed]: {
    Glyph: RotateCw,
    filled: false,
    label: 'Replay this session',
  },
  [PlayingState.Paused]: { Glyph: Play, filled: true, label: 'Play' },
};

export function PlayButton({ togglePlay, iconSize, state }: IProps) {
  const { Glyph, filled, label } = Values[state];

  return (
    <Tooltip
      title={
        <span className="flex gap-2 items-center">
          <PlayPauseSessionShortcut />
          {label}
        </span>
      }
    >
      <button
        type="button"
        aria-label={label}
        onClick={togglePlay}
        className="m-hover inline-flex items-center justify-center rounded-full text-content-accent"
      >
        <Glyph
          size={iconSize}
          fill={filled ? 'currentColor' : 'none'}
          strokeWidth={filled ? 0 : 2}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  );
}
