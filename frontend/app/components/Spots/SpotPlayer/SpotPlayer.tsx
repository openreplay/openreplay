import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { EscapeButton, Loader } from 'UI';

import {
  debounceUpdate,
  getDefaultPanelHeight,
} from '../../Session/Player/ReplayPlayer/PlayerInst';
import SpotConsole from './components/Panels/SpotConsole';
import SpotNetwork from './components/Panels/SpotNetwork';
import SpotLocation from './components/SpotLocation';
import SpotPlayerControls from './components/SpotPlayerControls';
import SpotPlayerHeader from './components/SpotPlayerHeader';
import SpotPlayerSideBar from './components/SpotSideBar';
import SpotTimeline from './components/SpotTimeline';
import SpotVideoContainer from './components/SpotVideoContainer';
import { Tab } from './consts';
import spotPlayerStore, { PANELS } from './spotPlayerStore';

function SpotPlayer() {
  const defaultHeight = getDefaultPanelHeight();
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  const { spotStore } = useStore();
  const { spotId } = useParams<{ spotId: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab | null>(null);

  const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const diff = startHeight - deltaY;
      const max =
        diff > window.innerHeight / 1.5 ? window.innerHeight / 1.5 : diff;
      const newHeight = Math.max(50, max);
      setPanelHeight(newHeight);
      debounceUpdate(newHeight);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  React.useEffect(() => {
    spotStore.fetchSpotById(spotId).then(async (spotInst) => {
      if (spotInst.mobURL) {
        void spotStore.getPubKey(spotId)
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
    return (
      <div className={'w-screen h-screen flex items-center justify-center'}>
        <Loader />
      </div>
    );
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
          {!isFullScreen && spotPlayerStore.activePanel ? (
            <div
              style={{
                height: panelHeight,
                maxWidth: activeTab ? 'calc(100vw - 320px)' : '100vw',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                onMouseDown={handleResize}
                className={
                  'w-full h-2 cursor-ns-resize absolute top-0 left-0 z-20'
                }
              />
              {spotPlayerStore.activePanel ? (
                <div className={'w-full h-full bg-white'}>
                  {spotPlayerStore.activePanel === PANELS.CONSOLE ? (
                    <SpotConsole />
                  ) : null}
                  {spotPlayerStore.activePanel === PANELS.NETWORK ? (
                    <SpotNetwork panelHeight={panelHeight} />
                  ) : null}
                </div>
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
