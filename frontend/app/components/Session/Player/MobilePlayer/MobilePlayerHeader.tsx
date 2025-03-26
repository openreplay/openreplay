import React from 'react';
import { useHistory } from 'react-router-dom';
import { sessions as sessionsRoute, withSiteId } from 'App/routes';
import { BackLink } from 'UI';
import cn from 'classnames';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import Tabs from 'Components/Session/Tabs';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import stl from '../ReplayPlayer/playerBlockHeader.module.css';
import UserCard from '../ReplayPlayer/EventsBlock/UserCard';

const SESSIONS_ROUTE = sessionsRoute();

interface Props {
  fullscreen: boolean;
  setActiveTab: (tab: string) => void;
  activeTab: string;
  tabs: Record<string, string>;
}

function PlayerBlockHeader(props: Props) {
  const [hideBack, setHideBack] = React.useState(false);
  const { player, store } = React.useContext(PlayerContext);

  const playerState = store?.get?.() || {
    width: 0,
    height: 0,
    showEvents: false,
  };
  const { width = 0, height = 0, showEvents = false } = playerState;
  const { customFieldStore, projectsStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const siteId = projectsStore.siteId!;
  const history = useHistory();
  const { fullscreen, setActiveTab, activeTab } = props;
  const metaList = customFieldStore.list.map((i: any) => i.key);

  React.useEffect(() => {
    const iframe = localStorage.getItem(IFRAME) || false;
    setHideBack(!!iframe && iframe === 'true');

    if (metaList.length === 0) customFieldStore.fetchList();
  }, []);

  const backHandler = () => {
    history.push(withSiteId(SESSIONS_ROUTE, siteId));
  };

  const { metadata } = session;
  const _metaList = Object.keys(metadata || {})
    .filter((i) => metaList.includes(i))
    .map((key) => {
      const value = metadata[key];
      return { label: key, value };
    });

  const TABS = Object.keys(props.tabs).map((tab) => ({
    text: props.tabs[tab],
    key: tab,
  }));

  return (
    <div
      className={cn(stl.header, 'flex justify-between', { hidden: fullscreen })}
    >
      <div className="flex w-full items-center">
        {!hideBack && (
          <div
            className="flex items-center h-full cursor-pointer group"
            onClick={backHandler}
          >
            {/* @ts-ignore TODO */}
            <BackLink label="Back" className="h-full ml-2" />
            <div className={stl.divider} />
          </div>
        )}
        <UserCard className="" width={width} height={height} />

        <div className={cn('ml-auto flex items-center h-full')}>
          {_metaList.length > 0 && (
            <div className="border-l h-full flex items-center px-2">
              <SessionMetaList
                className=""
                metaList={_metaList}
                maxLength={2}
              />
            </div>
          )}
        </div>
      </div>
      <div className="relative border-l" style={{ minWidth: activeTab === 'EXPORT' ? '360px' : '270px' }}>
        <Tabs
          tabs={TABS}
          active={activeTab}
          onClick={(tab) => {
            if (activeTab === tab) {
              setActiveTab('');
              player.toggleEvents();
            } else {
              setActiveTab(tab);
              !showEvents && player.toggleEvents();
            }
          }}
          border={false}
        />
      </div>
    </div>
  );
}

const PlayerHeaderCont = observer(PlayerBlockHeader);

export default PlayerHeaderCont;
