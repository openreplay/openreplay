import { clsx as cn } from 'clsx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import useLatestRef from 'App/hooks/useLatestRef';
import { useStore } from 'App/mstore';
import { SKIP_INTERVALS } from 'App/player-ui/clock';
import { useLocation } from 'App/routing';
import { ownsKeys } from 'App/utils/keys';
import 'Components/Session/ReplayScreen/replay-timeline.css';

import AssistDuration from './AssistDuration';
import AssistSessionsTabs from './AssistSessionsTabs';
import Timeline from './Timeline';

function Controls(props: any) {
  const { t } = useTranslation();
  const { uiPlayerStore, searchStoreLive, sessionStore } = useStore();
  const { skipInterval } = uiPlayerStore;
  // @ts-ignore ?? TODO
  const { player, store } = React.useContext<ILivePlayerContext>(PlayerContext);
  const [noControls, setNoControls] = React.useState(false);
  const [noGrid, setNoGrid] = React.useState(false);
  const { search } = useLocation();

  const { jumpToLive } = player;
  const { livePlay } = store.get();

  const session = sessionStore.current;
  const fetchAssistSessions = sessionStore.fetchLiveSessions;
  const totalAssistSessions = sessionStore.totalLiveSessions;
  const closedLive = !!sessionStore.errorStack?.length || !sessionStore.current;

  const skipRef = useLatestRef(skipInterval);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (ownsKeys(e.target)) return;
      const step = SKIP_INTERVALS[skipRef.current];
      if (e.key === 'ArrowRight') player.jumpInterval(step);
      if (e.key === 'ArrowLeft') player.jumpInterval(-step);
    };
    document.addEventListener('keydown', onKeyDown);
    if (totalAssistSessions === 0) {
      fetchAssistSessions();
    }
    const queryParams = new URLSearchParams(search);
    if (queryParams.has('noFooter') && queryParams.get('noFooter') === 'true') {
      setNoControls(true);
    }

    if (queryParams.has('noGrid') && queryParams.get('noGrid') === 'true') {
      setNoGrid(true);
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (noControls) return null;
  return (
    <div className="m-tl">
      {!closedLive && (
        <>
          <button
            type="button"
            className={`m-live-chip${livePlay ? ' is-live' : ''}`}
            onClick={() => (livePlay ? null : jumpToLive())}
            title={livePlay ? undefined : t('Jump to live')}
          >
            <i className="m-live-chip__dot" aria-hidden="true" />
            {livePlay ? t('Live') : t('Go live')}
          </button>
          <span className="m-tl__clock m-mono">
            <AssistDuration />
          </span>
        </>
      )}
      {session.liveOnly ? <span className="flex-1" /> : <Timeline />}
      {totalAssistSessions > 1 && !noGrid ? (
        <AssistSessionsTabs session={session} />
      ) : null}
    </div>
  );
}

const ControlPlayer = observer(Controls);

export default ControlPlayer;
