import { SPEED_OPTIONS } from 'Player/player/Player';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { SpeedOptions } from 'App/components/Session_/Player/Controls/components/ControlsComponents';
import {
  FullScreenButton,
  PlayButton,
  PlayTime,
  PlayingState,
} from 'App/player-ui';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';

import spotPlayerStore, { PANELS, PanelType } from "../spotPlayerStore";

function SpotPlayerControls() {
  const toggleFullScreen = () => {
    spotPlayerStore.setIsFullScreen(true);
  };
  const togglePlay = () => {
    spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
  };

  const changeSpeed = (speed: number) => {
    spotPlayerStore.setPlaybackRate(SPEED_OPTIONS[speed]);
  };
  const playState = spotPlayerStore.isPlaying
    ? PlayingState.Playing
    : PlayingState.Paused;

  const togglePanel = (panel: PanelType) => {
    spotPlayerStore.setActivePanel(panel === spotPlayerStore.activePanel ? null : panel);
  }
  return (
    <div className={'w-full p-4 flex items-center gap-4 bg-white'}>
      <PlayButton togglePlay={togglePlay} state={playState} iconSize={36} />

      <div
        className={
          'px-2 py-1 bg-white rounded font-semibold text-black flex items-center gap-2'
        }
      >
        <PlayTime
          isCustom
          time={spotPlayerStore.time * 1000}
          format={'mm:ss'}
        />
        <span>/</span>
        <div>{spotPlayerStore.durationString}</div>
      </div>

      <SpeedOptions
        toggleSpeed={changeSpeed}
        disabled={false}
        speed={spotPlayerStore.playbackRate}
      />

      <div className={'ml-auto'} />

      <ControlButton
        label={'Console'}
        onClick={() => togglePanel(PANELS.CONSOLE)}
        active={spotPlayerStore.activePanel === PANELS.CONSOLE}
      />
      <ControlButton
        label={'Network'}
        onClick={() => togglePanel(PANELS.NETWORK)}
        active={spotPlayerStore.activePanel === PANELS.NETWORK}
      />

      <FullScreenButton size={18} onClick={toggleFullScreen} />
    </div>
  );
}

export default observer(SpotPlayerControls);
