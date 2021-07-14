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
import { Controls as PlayerControls, toggleEvents } from 'Player';
import cn from 'classnames'


import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import EventsBlock from '../Session_/EventsBlock';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.css';
import EventsToggleButton from './EventsToggleButton';



const EventsBlockConnected = connectPlayer(state => ({
  currentTimeEventIndex: state.eventListNow.length > 0 ? state.eventListNow.length - 1 : 0,
  playing: state.playing,
}))(EventsBlock)


const InitLoader = connectPlayer(state => ({ 
  loading: !state.initialized
}))(Loader);

const PlayerContentConnected = connectPlayer(state => ({ 
  showEvents: !state.showEvents
}), { toggleEvents })(PlayerContent);


function PlayerContent({ live, fullscreen, showEvents, toggleEvents }) {
  return (
    <div className={ cn(styles.session, 'relative') } data-fullscreen={fullscreen}>
      <PlayerBlock />      
      { showEvents && !live && !fullscreen && <EventsBlockConnected player={PlayerControls}/> }
    </div>
  )
}

function WebPlayer ({ session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt }) {
  useEffect(() => {
    initPlayer(session, jwt);
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
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
}), {
  toggleFullscreen,
  closeBottomBlock,
})(WebPlayer)

