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
import { Controls as PlayerControls } from 'Player';
import Assist from 'Components/Assist'


import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import EventsBlock from '../Session_/EventsBlock';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.css';



const EventsBlockConnected = connectPlayer(state => ({
  currentTimeEventIndex: state.eventListNow.length > 0 ? state.eventListNow.length - 1 : 0,
  playing: state.playing,
}))(EventsBlock)


const InitLoader = connectPlayer(state => ({ 
  loading: !state.initialized
}))(Loader);


function WebPlayer ({ showAssist, session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt }) {
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
      <InitLoader className="flex-1 p-3">
        { showAssist && <Assist session={session} /> }
        <PlayerBlockHeader fullscreen={fullscreen}/>
        <div className={ styles.session } data-fullscreen={fullscreen}>
          <PlayerBlock />
        </div>
      </InitLoader>
    </PlayerProvider>
  );
}


export default connect(state => ({
  session: state.getIn([ 'sessions', 'current' ]),
  showAssist: state.getIn([ 'sessions', 'showChatWindow' ]),
  jwt: state.get('jwt'),
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
}), {
  toggleFullscreen,
  closeBottomBlock,
})(WebPlayer) 

