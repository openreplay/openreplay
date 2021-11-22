import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { 
  PlayerProvider,
  connectPlayer,
  init as initPlayer,
  clean as cleanPlayer,
} from 'Player';
import cn from 'classnames'
import RightBlock from './RightBlock'


import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.css';


const InitLoader = connectPlayer(state => ({ 
  loading: !state.initialized
}))(Loader);

const PlayerContentConnected = connectPlayer(state => ({ 
  showEvents: !state.showEvents
}))(PlayerContent);


function PlayerContent({ live, fullscreen, showEvents }) {
  return (
    <div className={ cn(styles.session, 'relative') } data-fullscreen={fullscreen}>
      <PlayerBlock />      
      { showEvents && !live && !fullscreen && <RightBlock /> }      
    </div>
  )
}

function WebPlayer ({ session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt, config }) {
  useEffect(() => {
    initPlayer(session, jwt, config);
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
        <PlayerBlockHeader fullscreen={fullscreen}/>
        <PlayerContentConnected fullscreen={fullscreen} live={live} />
      </InitLoader>
    </PlayerProvider>
  );
}


export default connect(state => ({
  session: state.getIn([ 'sessions', 'current' ]),
  jwt: state.get('jwt'),
  config: state.getIn([ 'user', 'account', 'iceServers' ]),
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
}), {
  toggleFullscreen,
  closeBottomBlock,
})(WebPlayer)

