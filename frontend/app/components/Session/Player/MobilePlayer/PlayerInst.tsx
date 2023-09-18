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
  PERFORMANCE,
  EXCEPTIONS,
  OVERVIEW,
  fullscreenOff,
} from 'Duck/components/player';
import { MobileNetworkPanel } from 'Shared/DevTools/NetworkPanel';
import { MobilePerformance } from 'Components/Session_/Performance';
import { MobileExceptions } from 'Components/Session_/Exceptions/Exceptions';
import MobileControls from './MobileControls';
import Overlay from './MobileOverlay'
import stl from 'Components/Session_/Player/player.module.css';
import { updateLastPlayedSession } from 'Duck/sessions';
import { MobileOverviewPanel } from 'Components/Session_/OverviewPanel';
import MobileConsolePanel from 'Shared/DevTools/ConsolePanel/MobileConsolePanel';
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { MobileStackEventPanel } from 'Shared/DevTools/StackEventPanel';
import ReplayWindow from "Components/Session/Player/MobilePlayer/ReplayWindow";
import PerfWarnings from "Components/Session/Player/MobilePlayer/PerfWarnings";

interface IProps {
  fullView: boolean;
  isMultiview?: boolean;
  bottomBlock: number;
  fullscreen: boolean;
  fullscreenOff: () => any;
  nextId: string;
  sessionId: string;
  activeTab: string;
  updateLastPlayedSession: (id: string) => void
  videoURL: string;
  userDevice: string;
}

function Player(props: IProps) {
  const {
    fullscreen,
    fullscreenOff,
    nextId,
    bottomBlock,
    activeTab,
    fullView,
    videoURL,
    userDevice,
  } = props;
  const playerContext = React.useContext(MobilePlayerContext);
  const isReady = playerContext.store.get().ready
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const bottomBlockIsActive = !fullscreen && bottomBlock !== NONE;
  const [isAttached, setAttached] = React.useState(false);

  React.useEffect(() => {
    props.updateLastPlayedSession(props.sessionId);
    const parentElement = findDOMNode(screenWrapper.current) as HTMLDivElement | null; //TODO: good architecture
    if (parentElement && !isAttached) {
      playerContext.player.attach(parentElement);
      setAttached(true)
    }
  }, [isReady]);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [props.bottomBlock, props.fullscreen, playerContext.player, activeTab, fullView]);

  React.useEffect(() => {
    playerContext.player.addFullscreenBoundary(props.fullscreen || fullView);
  }, [props.fullscreen, fullView])
  if (!playerContext.player) return null;

  const maxWidth = activeTab ? 'calc(100vw - 270px)' : '100vw';
  return (
    <div
      className={cn(stl.playerBody, 'flex-1 flex flex-col relative', fullscreen && 'pb-2')}
      data-bottom-block={bottomBlockIsActive}
    >
      {fullscreen && <EscapeButton onClose={fullscreenOff} />}
      <div className={"relative flex-1"}>
        <Overlay nextId={nextId} />

        <div className={cn(stl.mobileScreenWrapper)} ref={screenWrapper}>
          <ReplayWindow videoURL={videoURL} userDevice={userDevice} />
          <PerfWarnings userDevice={userDevice} />
        </div>
      </div>
      {!fullscreen && !!bottomBlock && (
        <div style={{ maxWidth, width: '100%' }}>
          {bottomBlock === OVERVIEW && <MobileOverviewPanel />}
          {bottomBlock === CONSOLE && <MobileConsolePanel isLive={false} />}
          {bottomBlock === STACKEVENTS && <MobileStackEventPanel />}
          {bottomBlock === NETWORK && <MobileNetworkPanel />}
          {bottomBlock === PERFORMANCE && <MobilePerformance />}
          {bottomBlock === EXCEPTIONS && <MobileExceptions />}
        </div>
      )}
      {!fullView ? (
        <MobileControls
          speedDown={playerContext.player.speedDown}
          speedUp={playerContext.player.speedUp}
          jump={playerContext.player.jump}
        />
      ) : null}
    </div>
  );
}

export default connect(
  (state: any) => ({
    fullscreen: state.getIn(['components', 'player', 'fullscreen']),
    nextId: state.getIn(['sessions', 'nextId']),
    sessionId: state.getIn(['sessions', 'current']).sessionId,
    userDevice: state.getIn(['sessions', 'current']).userDevice,
    videoURL: state.getIn(['sessions', 'current']).videoURL,
    bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
  }),
  {
    fullscreenOff,
    updateLastPlayedSession,
  }
)(Player);
