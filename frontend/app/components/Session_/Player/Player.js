import React from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import { EscapeButton } from 'UI';
import {
  NONE,
  CONSOLE,
  NETWORK,
  STACKEVENTS,
  STORAGE,
  PROFILER,
  PERFORMANCE,
  GRAPHQL,
  EXCEPTIONS,
  INSPECTOR,
  OVERVIEW,
  fullscreenOff,
} from 'Duck/components/player';
import NetworkPanel from 'Shared/DevTools/NetworkPanel';
import Storage from '../Storage';
import { ConnectedPerformance } from '../Performance';
import GraphQL from '../GraphQL';
import Exceptions from '../Exceptions/Exceptions';
import Inspector from '../Inspector';
import Controls from './Controls';
import Overlay from './Overlay';
import stl from './player.module.css';
import { updateLastPlayedSession } from 'Duck/sessions';
import OverviewPanel from '../OverviewPanel';
import ConsolePanel from 'Shared/DevTools/ConsolePanel';
import ProfilerPanel from 'Shared/DevTools/ProfilerPanel';
import { PlayerContext } from 'App/components/Session/playerContext';
import StackEventPanel from 'Shared/DevTools/StackEventPanel';

function Player(props) {
  const {
    className,
    fullscreen,
    fullscreenOff,
    nextId,
    closedLive,
    bottomBlock,
    activeTab,
    fullView,
    isMultiview,
  } = props;
  const playerContext = React.useContext(PlayerContext)
  const screenWrapper = React.useRef();
  const bottomBlockIsActive = !fullscreen && bottomBlock !== NONE

  React.useEffect(() => {
    props.updateLastPlayedSession(props.sessionId);
    if (!props.closedLive || isMultiview) {
      const parentElement = findDOMNode(screenWrapper.current); //TODO: good architecture
      playerContext.player.attach(parentElement)
      playerContext.player.play();
    }

  }, [])

  React.useEffect(() => {
    playerContext.player.scale();
  }, [props.bottomBlock, props.fullscreen, playerContext.player])

  if (!playerContext.player) return null;

  const maxWidth = activeTab ? 'calc(100vw - 270px)' : '100vw';
  return (
    <div
        className={cn(className, stl.playerBody, 'flex flex-col relative', fullscreen && 'pb-2')}
        data-bottom-block={bottomBlockIsActive}
      >
        {fullscreen && <EscapeButton onClose={fullscreenOff} />}
        <div className="relative flex-1 overflow-hidden">
          <Overlay nextId={nextId} closedLive={closedLive} />
          <div className={stl.screenWrapper} ref={screenWrapper} />
        </div>
        {!fullscreen && !!bottomBlock && (
          <div style={{ maxWidth, width: '100%' }}>
            {bottomBlock === OVERVIEW && <OverviewPanel />}
            {bottomBlock === CONSOLE && <ConsolePanel />}
            {bottomBlock === NETWORK && (
              <NetworkPanel />
            )}
            {/* {bottomBlock === STACKEVENTS && <StackEvents />} */}
            {bottomBlock === STACKEVENTS && <StackEventPanel />}
            {bottomBlock === STORAGE && <Storage />}
            {bottomBlock === PROFILER && <ProfilerPanel />}
            {bottomBlock === PERFORMANCE && <ConnectedPerformance />}
            {bottomBlock === GRAPHQL && <GraphQL />}
            {bottomBlock === EXCEPTIONS && <Exceptions />}
            {bottomBlock === INSPECTOR && <Inspector />}
          </div>
        )}
        {!fullView && !isMultiview && <Controls
          speedDown={playerContext.player.speedDown}
          speedUp={playerContext.player.speedUp}
          jump={playerContext.player.jump}
         />}
      </div>
  )
}

export default connect((state) => {
    const isAssist = window.location.pathname.includes('/assist/');
    return {
      fullscreen: state.getIn(['components', 'player', 'fullscreen']),
      nextId: state.getIn(['sessions', 'nextId']),
      sessionId: state.getIn(['sessions', 'current']).sessionId,
      bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
      closedLive:
        !!state.getIn(['sessions', 'errors']) ||
        (isAssist && !state.getIn(['sessions', 'current']).live),
    };
  },
  {
    fullscreenOff,
    updateLastPlayedSession,
  }
)(Player)
