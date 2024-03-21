import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import PlayingTime from './PlayingTime';
import { JumpBack, IntervalSelector, JumpForward, SpeedOptions } from './ControlsComponents';
import TimelineZoomButton from 'Components/Session_/Player/Controls/components/TimelineZoomButton';

interface Props {
  skip: boolean;
  speed: number;
  disabled: boolean;
  startedAt: number;
  playButton: JSX.Element;
  skipIntervals: Record<number, number>;
  currentInterval: number;
  setSkipInterval: (interval: number) => void;
  backTenSeconds: () => void;
  forthTenSeconds: () => void;
  toggleSpeed: (speedIndex: number) => void;
  toggleSkip: () => void;
  sessionTz?: string;
}

export const TimeMode = {
  Real: 'real',
  UserReal: 'user_real',
  Timestamp: 'current',
} as const;
export type ITimeMode = (typeof TimeMode)[keyof typeof TimeMode];

function PlayerControls(props: Props) {
  const {
    skip,
    speed,
    disabled,
    playButton,
    backTenSeconds,
    forthTenSeconds,
    toggleSpeed,
    toggleSkip,
    skipIntervals,
    setSkipInterval,
    currentInterval,
    startedAt,
    sessionTz,
  } = props;
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [timeMode, setTimeMode] = React.useState<ITimeMode>(
    localStorage.getItem('__or_player_time_mode') as ITimeMode
  );

  const saveTimeMode = (mode: ITimeMode) => {
    localStorage.setItem('__or_player_time_mode', mode);
    setTimeMode(mode);
  };

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <div className="flex items-center">
      {playButton}
      <div className="mx-1" />

      <PlayingTime
        timeMode={timeMode}
        setTimeMode={saveTimeMode}
        startedAt={startedAt}
        sessionTz={sessionTz}
      />

      <div className="rounded ml-2 bg-white border-gray-light flex items-center" style={{ gap: 1 }}>
        <JumpBack backTenSeconds={backTenSeconds} currentInterval={currentInterval} />
        <IntervalSelector
          skipIntervals={skipIntervals}
          setSkipInterval={setSkipInterval}
          toggleTooltip={toggleTooltip}
          currentInterval={currentInterval}
        />
        <JumpForward forthTenSeconds={forthTenSeconds} currentInterval={currentInterval} />
      </div>

      <div className="flex items-center gap-2 ml-2">
        <TimelineZoomButton />
        <SpeedOptions
          toggleSpeed={toggleSpeed}
          disabled={disabled}
          toggleTooltip={toggleTooltip}
          speed={speed}
        />
        <Button
          onClick={toggleSkip}
          disabled={disabled}
          size={'small'}
          className={'flex items-center font-semibold'}
        >
          {skip && <Icon name="check" size="24" />}
          <span>Skip Inactivity</span>
        </Button>
      </div>
    </div>
  );
}

export default PlayerControls;
