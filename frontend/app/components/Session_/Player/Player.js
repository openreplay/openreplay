import React from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import { EscapeButton } from 'UI';
import { hide as hideTargetDefiner } from 'Duck/components/targetDefiner';
import { fullscreenOff } from 'Duck/components/player';
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
  LONGTASKS,
  INSPECTOR,
  OVERVIEW,
} from 'Duck/components/player';
import NetworkPanel from 'Shared/DevTools/NetworkPanel';
import Console from '../Console/Console';
import StackEvents from '../StackEvents/StackEvents';
import Storage from '../Storage';
import Profiler from '../Profiler';
import { ConnectedPerformance } from '../Performance';
import GraphQL from '../GraphQL';
import Exceptions from '../Exceptions/Exceptions';
import LongTasks from '../LongTasks';
import Inspector from '../Inspector';
import {
  attach as attachPlayer,
  Controls as PlayerControls,
  scale as scalePlayerScreen,
  connectPlayer,
} from 'Player';
import Controls from './Controls';
import Overlay from './Overlay';
import stl from './player.module.css';
import { updateLastPlayedSession } from 'Duck/sessions';
import OverviewPanel from '../OverviewPanel';
import ConsolePanel from 'Shared/DevTools/ConsolePanel';
import ProfilerPanel from 'Shared/DevTools/ProfilerPanel';

@connectPlayer((state) => ({
  live: state.live,
}))
@connect(
  (state) => {
    const isAssist = window.location.pathname.includes('/assist/');
    return {
      fullscreen: state.getIn(['components', 'player', 'fullscreen']),
      nextId: state.getIn(['sessions', 'nextId']),
      sessionId: state.getIn(['sessions', 'current', 'sessionId']),
      closedLive:
        !!state.getIn(['sessions', 'errors']) ||
        (isAssist && !state.getIn(['sessions', 'current', 'live'])),
    };
  },
  {
    hideTargetDefiner,
    fullscreenOff,
    updateLastPlayedSession,
  }
)
export default class Player extends React.PureComponent {
  screenWrapper = React.createRef();

  componentDidUpdate(prevProps) {
    if (
      [prevProps.bottomBlock, this.props.bottomBlock].includes(NONE) ||
      prevProps.fullscreen !== this.props.fullscreen
    ) {
      scalePlayerScreen();
    }
  }

  componentDidMount() {
    this.props.updateLastPlayedSession(this.props.sessionId);
    if (this.props.closedLive) return;

    const parentElement = findDOMNode(this.screenWrapper.current); //TODO: good architecture
    attachPlayer(parentElement);
  }

  render() {
    const {
      className,
      bottomBlockIsActive,
      fullscreen,
      fullscreenOff,
      nextId,
      closedLive,
      bottomBlock,
      activeTab,
    } = this.props;

    const maxWidth = activeTab ? 'calc(100vw - 270px)' : '100vw';
    return (
      <div
        className={cn(className, stl.playerBody, 'flex flex-col relative', fullscreen && 'pb-2')}
        data-bottom-block={bottomBlockIsActive}
      >
        {fullscreen && <EscapeButton onClose={fullscreenOff} />}
        <div className="relative flex-1 overflow-hidden">
          <Overlay nextId={nextId} togglePlay={PlayerControls.togglePlay} closedLive={closedLive} />
          <div className={stl.screenWrapper} ref={this.screenWrapper} />
        </div>
        {!fullscreen && !!bottomBlock && (
          <div style={{ maxWidth, width: '100%' }}>
            {bottomBlock === OVERVIEW && <OverviewPanel />}
            {bottomBlock === CONSOLE && <ConsolePanel />}
            {bottomBlock === NETWORK && (
              // <Network />
              <NetworkPanel />
            )}
            {bottomBlock === STACKEVENTS && <StackEvents />}
            {bottomBlock === STORAGE && <Storage />}
            {bottomBlock === PROFILER && <ProfilerPanel />}
            {bottomBlock === PERFORMANCE && <ConnectedPerformance />}
            {bottomBlock === GRAPHQL && <GraphQL />}
            {bottomBlock === EXCEPTIONS && <Exceptions />}
            {bottomBlock === LONGTASKS && <LongTasks />}
            {bottomBlock === INSPECTOR && <Inspector />}
          </div>
        )}
        <Controls {...PlayerControls} />
      </div>
    );
  }
}
