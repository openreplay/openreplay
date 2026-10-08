import { Loader } from '@/ui/feedback/Loader';
import { Icon } from '@/ui/icons/Icon';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { spotsList } from 'App/routes';
import { useHistory, useParams } from 'App/routing';
import { ownsKeys } from 'App/utils/keys';
import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import PhoneHorizontalWarn from 'Components/Session/Player/SharedComponents/PhoneHorizontal';
import { DevToolsFrame } from 'Components/Session/ReplayScreen/DevToolsFrame';
import { ReplayScreen } from 'Components/Session/ReplayScreen/ReplayScreen';
import 'Components/Session/ReplayScreen/replay-player.css';
import withPermissions from 'Components/hocs/withPermissions';

import AccessError from './components/AccessError';
import CommentsSection from './components/CommentsSection';
import MobilePlayerOverlay from './components/MobileControlOverlay';
import SpotConsole from './components/Panels/SpotConsole';
import SpotNetwork from './components/Panels/SpotNetwork';
import SpotActivity from './components/SpotActivity';
import SpotLocation from './components/SpotLocation';
import SpotPlayerControls from './components/SpotPlayerControls';
import { SpotActions, SpotLead } from './components/SpotPlayerHeader';
import SpotVideoContainer from './components/SpotVideoContainer';
import { TABS, Tab } from './consts';
import spotPlayerStore, { PANELS, PanelType } from './spotPlayerStore';

// X-Ray carries echarts: loaded when the panel opens
const SpotOverviewPanelCont = React.lazy(() =>
  import('Components/Session_/OverviewPanel/OverviewPanel').then((m) => ({
    default: m.SpotOverviewPanelCont,
  })),
);

function SpotPlayer() {
  const { t } = useTranslation();
  const defaultHeight = getDefaultPanelHeight();
  const history = useHistory();
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  const { spotStore, userStore } = useStore();
  const userEmail = userStore.account.name;
  const loggedIn = !!userEmail;
  const { spotId } = useParams<{ spotId: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab | null>(null);

  React.useEffect(() => {
    if (spotStore.currentSpot) {
      document.title = `${spotStore.currentSpot.title} - OpenReplay`;
    }
  }, [spotStore.currentSpot]);

  const jumpForward = () => {
    spotPlayerStore.setTime(
      Math.min(
        spotPlayerStore.duration,
        spotPlayerStore.time + spotPlayerStore.skipInterval,
      ),
    );
  };

  const jumpBackward = () => {
    spotPlayerStore.setTime(
      Math.max(0, spotPlayerStore.time - spotPlayerStore.skipInterval),
    );
  };

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const pubKey = query.get('pub_key');
    if (!loggedIn && !pubKey) {
      history.push('/');
    }
    if (pubKey) {
      spotStore.setAccessKey(pubKey);
    }

    spotStore
      .fetchSpotById(spotId, pubKey ?? undefined)
      .then(async (spotInst) => {
        if (spotInst.mobURL) {
          try {
            void spotStore.getPubKey(spotId);
          } catch {
            // ignore
          }
          try {
            const mobResp = await fetch(spotInst.mobURL);
            const {
              clicks = [],
              logs = [],
              network = [],
              locations = [],
              startTs = 0,
              browserVersion,
              resolution,
              platform,
            } = await mobResp.json();
            spotPlayerStore.setStartTs(startTs);
            spotPlayerStore.setDuration(spotInst.duration);
            spotPlayerStore.setDeviceData(browserVersion, resolution, platform);
            spotPlayerStore.setEvents(logs, locations, clicks, network);
          } catch (e) {
            console.error("Couldn't parse mob file", e);
          }
        }
      });

    const ev = (e: KeyboardEvent) => {
      if (ownsKeys(e.target)) return false;
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
      if (e.key === 'ArrowRight') {
        jumpForward();
      }
      if (e.key === 'ArrowLeft') {
        jumpBackward();
      }
    };

    document.addEventListener('keydown', ev);
    return () => {
      document.removeEventListener('keydown', ev);
      spotStore.clearCurrent();
      spotPlayerStore.clearData();
    };
  }, [loggedIn]);

  if (!spotStore.currentSpot) {
    return (
      <div className="w-screen h-screen flex items-center justify-center flex-col gap-2">
        {spotStore.accessError ? <AccessError /> : <Loader />}
      </div>
    );
  }

  const spot = spotStore.currentSpot;
  const { isFullScreen, activePanel } = spotPlayerStore;
  const comments = spot.comments ?? [];
  const devtools: { key: PanelType; label: string }[] = [
    { key: PANELS.OVERVIEW, label: 'X-Ray' },
    { key: PANELS.CONSOLE, label: t('Console') },
    { key: PANELS.NETWORK, label: t('Network') },
  ];
  const togglePanel = (panel: PanelType) =>
    spotPlayerStore.setActivePanel(panel === activePanel ? null : panel);

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden',
        !loggedIn && 'h-dvh w-screen bg-surface-canvas p-3',
      )}
    >
      <PhoneHorizontalWarn />
      <ReplayScreen
        back={
          loggedIn
            ? {
                label: t('All Spots'),
                onClick: () => history.push(spotsList()),
              }
            : undefined
        }
        lead={
          <>
            {!loggedIn ? (
              <a
                href="https://openreplay.com/platform/spot/"
                target="_blank"
                rel="noreferrer"
                className="m-spotp__brand"
              >
                <Icon name="orSpot" size={22} />
                <span>{t('Spot')}</span>
              </a>
            ) : null}
            <SpotLead
              title={spot.title}
              user={spot.user}
              date={spot.createdAt}
              resolution={spotPlayerStore.resolution}
              platform={spotPlayerStore.platform}
              browserVersion={spotPlayerStore.browserVersion}
            />
          </>
        }
        actions={<SpotActions />}
        panels={[
          { key: TABS.ACTIVITY, label: t('Activity') },
          {
            key: TABS.COMMENTS,
            label: t('Comments'),
            count: comments.length || undefined,
          },
        ]}
        panel={activeTab}
        onPanel={(key) => setActiveTab(key as Tab | null)}
        renderPanel={(key) =>
          key === TABS.COMMENTS ? <CommentsSection /> : <SpotActivity />
        }
        fullscreen={isFullScreen}
      >
        <section className="m-player">
          {isFullScreen ? null : <SpotLocation />}
          <div className="relative flex min-h-0 flex-1">
            <MobilePlayerOverlay
              isPlaying={spotPlayerStore.isPlaying}
              onPlay={() => spotPlayerStore.setIsPlaying(true)}
              onStop={() => spotPlayerStore.setIsPlaying(false)}
              onJumpForward={jumpForward}
              onJumpBackward={jumpBackward}
            />
            <SpotVideoContainer
              videoURL={spot.videoURL!}
              streamFile={spot.streamFile}
              thumbnail={spot.thumbnail}
              checkReady={() => spotStore.checkIsProcessed(spotId)}
            />
          </div>
          {isFullScreen ? null : (
            <DevToolsFrame
              tabs={devtools}
              open={activePanel}
              onToggle={togglePanel}
              height={panelHeight}
              onHeight={(h) => {
                setPanelHeight(h);
                debounceUpdate(h);
              }}
            >
              {activePanel === PANELS.CONSOLE ? (
                <SpotConsole onClose={() => togglePanel(PANELS.CONSOLE)} />
              ) : null}
              {activePanel === PANELS.NETWORK ? (
                <SpotNetwork
                  onClose={() => togglePanel(PANELS.NETWORK)}
                  panelHeight={panelHeight}
                />
              ) : null}
              {activePanel === PANELS.OVERVIEW ? (
                <SpotOverviewConnector jump={spotPlayerStore.setTime} />
              ) : null}
            </DevToolsFrame>
          )}
          <SpotPlayerControls />
        </section>
      </ReplayScreen>
    </div>
  );
}

const SpotOverviewConnector = observer(
  ({ jump }: { jump: (time: number) => null }) => {
    const endTime = spotPlayerStore.duration * 1000;
    const time = spotPlayerStore.time * 1000;
    // time ticks ~10x a second for the pointer; the lists only change with the data
    const { network, logs } = spotPlayerStore;
    const resourceList = React.useMemo(
      () =>
        network.filter(
          (r: any) =>
            r.type === 'xhr' &&
            (r.isRed || r.isYellow || (r.status && r.status >= 400)),
        ),
      [network],
    );
    const exceptionsList = React.useMemo(
      () => logs.filter((l) => l.level === 'error'),
      [logs],
    );

    const onClose = () => {
      spotPlayerStore.setActivePanel(null);
    };
    return (
      <React.Suspense fallback={null}>
        <SpotOverviewPanelCont
          exceptionsList={exceptionsList}
          resourceList={resourceList}
          spotTime={time}
          spotEndTime={endTime}
          onClose={onClose}
          time={time}
        />
      </React.Suspense>
    );
  },
);

export default withPermissions(['SPOT'])(observer(SpotPlayer));
