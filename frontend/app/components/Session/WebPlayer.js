import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { fetchList } from 'Duck/integrations';
import {
  PlayerProvider,
  connectPlayer,
  init as initPlayer,
  clean as cleanPlayer,
  Controls,
  toggleEvents,
} from 'Player';
import cn from 'classnames'
import RightBlock from './RightBlock'
import withLocationHandlers from "HOCs/withLocationHandlers";

import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';

const InitLoader = connectPlayer(state => ({
  loading: !state.initialized
}))(Loader);

const PlayerContentConnected = connectPlayer(state => ({
  showEvents: !state.showEvents,
}))(PlayerContent);


function PlayerContent({ live, fullscreen, activeTab }) {
  return (
    <div className={ cn(styles.session, 'relative') } data-fullscreen={fullscreen}>
      <PlayerBlock activeTab={activeTab} />
    </div>
  )
}

function RightMenu({ live, tabs, activeTab, setActiveTab, fullscreen }) {
  return  !live && !fullscreen && <RightBlock tabs={tabs} setActiveTab={setActiveTab} activeTab={activeTab} />
}

function WebPlayer (props) {
  const { session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt, fetchList } = props;

  const TABS = {
    EVENTS: 'Events',
    HEATMAPS: 'Click Map',
  }

  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    fetchList('issues')
    initPlayer(session, jwt);

    const jumptTime = props.query.get('jumpto');
    if (jumptTime) {
      Controls.jump(parseInt(jumptTime));
    }

    return () => cleanPlayer()
  }, [ session.sessionId ]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => () => {
    toggleFullscreen(false);

    closeBottomBlock();
  }, [])

  return (
    <PlayerProvider>
      <InitLoader className="flex-1">
          <PlayerBlockHeader activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} fullscreen={fullscreen}/>
            <div className="flex">
              <div className="w-full"><PlayerContentConnected activeTab={activeTab} fullscreen={fullscreen} live={live} /></div>
              {activeTab !== '' && <RightMenu activeTab={activeTab} setActiveTab={setActiveTab} fullscreen={fullscreen} tabs={TABS} live={live} />}
            </div>
      </InitLoader>
    </PlayerProvider>
  );
}

export default connect(state => ({
  session: state.getIn([ 'sessions', 'current' ]),
  jwt: state.get('jwt'),
  // config: state.getIn([ 'user', 'account', 'iceServers' ]),
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
  showEvents: state.get('showEvents'),
}), {
  toggleFullscreen,
  closeBottomBlock,
  fetchList,
})(withLocationHandlers()(WebPlayer));
