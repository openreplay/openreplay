import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import PlayingTime from './PlayingTime';
import {
  JumpBack,
  IntervalSelector,
  JumpForward,
  SpeedOptions,
} from './ControlsComponents';
import { useTranslation } from 'react-i18next';

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
  toggleSkip?: () => void;
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
  const { t } = useTranslation();
  const [timeMode, setTimeMode] = React.useState<ITimeMode>(
    localStorage.getItem('__or_player_time_mode') as ITimeMode,
  );

  const saveTimeMode = (mode: ITimeMode) => {
    localStorage.setItem('__or_player_time_mode', mode);
    setTimeMode(mode);
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

      <div
        className="rounded ml-1 bg-white border-gray-lighter flex items-center"
        style={{ gap: 1 }}
      >
        <JumpBack
          backTenSeconds={backTenSeconds}
          currentInterval={currentInterval}
        />
        <IntervalSelector
          skipIntervals={skipIntervals}
          setSkipInterval={setSkipInterval}
          currentInterval={currentInterval}
        />
        <JumpForward
          forthTenSeconds={forthTenSeconds}
          currentInterval={currentInterval}
        />
      </div>

      <div className="flex items-center gap-2 ml-2">
        <SpeedOptions
          toggleSpeed={toggleSpeed}
          disabled={disabled}
          speed={speed}
        />
        {toggleSkip && (
          <Button
            onClick={toggleSkip}
            disabled={disabled}
            size="small"
            className="flex items-center font-semibold"
          >
            {skip && <Icon name="check" size="24" />}
            <span>{t('Skip Inactivity')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default PlayerControls;
