import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import { 
  PlayerProvider,
  attach as attachPlayer,
  init as initPlayer,
  clean as cleanPlayer,
  callPeer,
 // scale
} from 'App/player';
import ChatWindow from './ChatWindow/ChatWindow'
//import ScreenSharing from './ScreenSharing/ScreenSharing'

function Assist({ session, jwt }) {
  const screeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    initPlayer(session, jwt);
    return () => cleanPlayer()
  }, [ session.sessionId ]);

  useEffect(() => {
    if (screeRef.current) {
      attachPlayer(findDOMNode(screeRef.current));
    }
  }, [ ])

  return (
    <div className="absolute">
      {/* <div ref={screeRef} 
      // Just for testing TODO: flexible layout. 
      // It should consider itself as empty but take maximum of the space available
      // Screen will adapt automatically.
        style={{height: "300px", width:"600px" }} 
        className="relative overflow-hidden bg-gray-lightest" 
       /> */}
      <ChatWindow call={ callPeer } />
    </div>
  )
}

export default connect(state => ({
  // session: { // Testing mock. Should be retrieved from redux
  //   // startedAt: 1624314191394, 
  //   live: true,
  //   // sessionId:  "4870254843916045",
  // },
  jwt: state.get('jwt'),
}))(Assist);
