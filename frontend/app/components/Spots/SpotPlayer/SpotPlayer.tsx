import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { EscapeButton, Loader } from 'UI';
import SpotConsole from "./components/Panels/SpotConsole";

import SpotLocation from './components/SpotLocation';
import SpotPlayerControls from './components/SpotPlayerControls';
import SpotPlayerHeader from './components/SpotPlayerHeader';
import SpotPlayerSideBar from './components/SpotSideBar';
import SpotTimeline from './components/SpotTimeline';
import SpotVideoContainer from './components/SpotVideoContainer';
import { Tab } from './consts';
import spotPlayerStore, { PANELS } from "./spotPlayerStore";

function SpotPlayer() {
  const { spotStore } = useStore();
  const { spotId } = useParams<{ spotId: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab | null>(null);

  React.useEffect(() => {
    spotStore.fetchSpotById(spotId).then(async (spotInst) => {
      if (spotInst.mobURL) {
        try {
          const mobResp = await fetch(spotInst.mobURL);
          const {
            clicks = [],
            logs = [],
            network = [],
            locations = [],
            startTs = 0,
          } = await mobResp.json();
          spotPlayerStore.setStartTs(startTs);
          spotPlayerStore.setDuration(spotInst.duration);
          spotPlayerStore.setEvents(logs, locations, clicks, network);
        } catch (e) {
          console.error("Couldn't parse mob file", e);
        }
      }
    });

    const ev = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        spotPlayerStore.setIsFullScreen(false);
      }
      if (e.key === 'F') {
        spotPlayerStore.setIsFullScreen(true);
      }
      if (e.key === ' ') {
        spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
      }
      if (e.key === 'ArrowDown') {
        const current = spotPlayerStore.playbackRate;
        spotPlayerStore.setPlaybackRate(Math.max(0.5, current / 2));
      }
      if (e.key === 'ArrowUp') {
        const current = spotPlayerStore.playbackRate;
        const highest = 16;
        spotPlayerStore.setPlaybackRate(Math.min(highest, current * 2));
      }
    };

    document.addEventListener('keydown', ev);
    return () => {
      document.removeEventListener('keydown', ev);
    };
  }, []);
  if (!spotStore.currentSpot) {
    return <Loader />;
  }
  console.log(spotStore.currentSpot);

  const closeTab = () => {
    setActiveTab(null);
  };

  const isFullScreen = spotPlayerStore.isFullScreen;
  return (
    <div
      className={cn(
        'w-screen h-screen flex flex-col',
        isFullScreen ? 'relative' : ''
      )}
    >
      {isFullScreen ? (
        <EscapeButton onClose={() => spotPlayerStore.setIsFullScreen(false)} />
      ) : null}
      <SpotPlayerHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title={spotStore.currentSpot.title}
        user={spotStore.currentSpot.user}
        date={spotStore.currentSpot.createdAt}
      />
      <div className={'w-full h-full flex'}>
        <div className={'w-full h-full flex flex-col justify-between'}>
          <SpotLocation />
          <div className={cn('w-full h-full', isFullScreen ? '' : 'relative')}>
            <SpotVideoContainer videoURL={spotStore.currentSpot.videoURL!} />
          </div>
          {spotPlayerStore.activePanel ? (
            <div className={'w-full h-64 bg-white'}>
              {spotPlayerStore.activePanel === PANELS.CONSOLE ? (
                <SpotConsole />
              ) : null}
            </div>
          ) : null}
          <SpotTimeline />
          {isFullScreen ? null : <SpotPlayerControls />}
        </div>
        <SpotPlayerSideBar
          activeTab={activeTab}
          onClose={closeTab}
          comments={spotStore.currentSpot?.comments ?? []}
        />
      </div>
    </div>
  );
}

export default observer(SpotPlayer);
