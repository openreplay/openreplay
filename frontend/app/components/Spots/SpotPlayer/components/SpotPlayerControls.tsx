import { SPEED_OPTIONS } from 'Player/player/Player';
import { observer } from 'mobx-react-lite';
import React from 'react';

import {
  IntervalSelector,
  JumpBack,
  JumpForward,
  SpeedOptions,
} from 'App/components/Session_/Player/Controls/components/ControlsComponents';
import {
  FullScreenButton,
  PlayButton,
  PlayTime,
  PlayingState,
} from 'App/player-ui';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';
import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';

import spotPlayerStore, { PANELS, PanelType } from '../spotPlayerStore';

function SpotPlayerControls() {
  const toggleFullScreen = () => {
    spotPlayerStore.setIsFullScreen(true);
  };
  const togglePlay = () => {
    if (spotPlayerStore.state === PlayingState.Completed) {
      spotPlayerStore.setTime(0);
      spotPlayerStore.setIsPlaying(true);
    }
    spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
  };

  const changeSpeed = (speed: number) => {
    spotPlayerStore.setPlaybackRate(SPEED_OPTIONS[speed]);
  };
  const playState = spotPlayerStore.state;

  const togglePanel = (panel: PanelType) => {
    spotPlayerStore.setActivePanel(
      panel === spotPlayerStore.activePanel ? null : panel,
    );
  };

  const back = () => {
    spotPlayerStore.setTime(
      spotPlayerStore.time - spotPlayerStore.skipInterval,
    );
  };
  const forth = () => {
    spotPlayerStore.setTime(
      spotPlayerStore.time + spotPlayerStore.skipInterval,
    );
  };

  return (
    <div className="w-full p-4 flex items-center gap-4 bg-white">
      <PlayButton togglePlay={togglePlay} state={playState} iconSize={36} />

      <div className="px-2 py-1 bg-white rounded font-semibold text-black flex items-center gap-2">
        <PlayTime isCustom time={spotPlayerStore.time * 1000} format="mm:ss" />
        <span>/</span>
        <div>{spotPlayerStore.durationString}</div>
      </div>

      <div
        className="rounded ml-1 bg-white border-gray-lighter flex items-center"
        style={{ gap: 1 }}
      >
        <JumpBack
          backTenSeconds={back}
          currentInterval={spotPlayerStore.skipInterval}
        />
        <IntervalSelector
          skipIntervals={SKIP_INTERVALS}
          setSkipInterval={spotPlayerStore.setSkipInterval}
          currentInterval={spotPlayerStore.skipInterval}
        />
        <JumpForward
          forthTenSeconds={forth}
          currentInterval={spotPlayerStore.skipInterval}
        />
      </div>

      <SpeedOptions
        toggleSpeed={changeSpeed}
        disabled={false}
        speed={spotPlayerStore.playbackRate}
      />

      <div className="ml-auto" />

      <ControlButton
        label="X-Ray"
        onClick={() => togglePanel(PANELS.OVERVIEW)}
        active={spotPlayerStore.activePanel === PANELS.OVERVIEW}
      />
      <ControlButton
        label="Console"
        onClick={() => togglePanel(PANELS.CONSOLE)}
        active={spotPlayerStore.activePanel === PANELS.CONSOLE}
      />
      <ControlButton
        label="Network"
        onClick={() => togglePanel(PANELS.NETWORK)}
        active={spotPlayerStore.activePanel === PANELS.NETWORK}
      />

      <FullScreenButton size={18} onClick={toggleFullScreen} />
    </div>
  );
}

export default observer(SpotPlayerControls);
