import React from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import {
  PlayerProvider,
  connectPlayer,
  init as initPlayer,
  clean as cleanPlayer,
  Controls,
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
  showEvents: !state.showEvents
}))(PlayerContent);


function PlayerContent({ live, fullscreen }) {
  return (
    <div className={ cn(styles.session, 'relative') } data-fullscreen={fullscreen}>
      <PlayerBlock />
    </div>
  )
}

function RightMenu({ showEvents, live, fullscreen }) {
  return showEvents && !live && !fullscreen && <RightBlock />
}
const ConnectedMenu = connectPlayer(state => ({
  showEvents: !state.showEvents}))(RightMenu)

function WebPlayer (props) {
  const { session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt, config, showEvents } = props;

  useEffect(() => {
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
        <div className="flex">
          <div className="w-full">
            <PlayerBlockHeader fullscreen={fullscreen}/>
            <PlayerContentConnected fullscreen={fullscreen} live={live} />
          </div>
          <ConnectedMenu fullscreen={fullscreen} live={live} />
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
})(withLocationHandlers()(WebPlayer));
