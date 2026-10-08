import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { useLocation } from 'App/routing';
import 'Components/Session/ReplayScreen/replay-timeline.css';
import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';

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

  const onKeyDown = (e: any) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (e.key === 'ArrowRight') {
      forthTenSeconds();
    }
    if (e.key === 'ArrowLeft') {
      backTenSeconds();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown.bind(this));
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
      document.removeEventListener('keydown', onKeyDown.bind(this));
    };
  }, []);

  const forthTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

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
