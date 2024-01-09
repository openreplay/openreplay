import React from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import { WebStackEventPanel } from 'Shared/DevTools/StackEventPanel/StackEventPanel';
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
import { WebNetworkPanel } from 'Shared/DevTools/NetworkPanel';
import Storage from 'Components/Session_/Storage';
import { ConnectedPerformance } from 'Components/Session_/Performance';
import GraphQL from 'Components/Session_/GraphQL';
import { Exceptions } from 'Components/Session_/Exceptions/Exceptions';
import Inspector from 'Components/Session_/Inspector';
import Controls from 'Components/Session_/Player/Controls';
import Overlay from 'Components/Session_/Player/Overlay';
import stl from 'Components/Session_/Player/player.module.css';
import { updateLastPlayedSession } from 'Duck/sessions';
import { OverviewPanel } from 'Components/Session_/OverviewPanel';
import ConsolePanel from 'Shared/DevTools/ConsolePanel';
import ProfilerPanel from 'Shared/DevTools/ProfilerPanel';
import { PlayerContext } from 'App/components/Session/playerContext';
import { debounce } from 'App/utils';
import { observer } from 'mobx-react-lite';

interface IProps {
  fullView: boolean;
  isMultiview?: boolean;
  bottomBlock: number;
  fullscreen: boolean;
  fullscreenOff: () => any;
  nextId: string;
  sessionId: string;
  activeTab: string;
  updateLastPlayedSession: (id: string) => void;
}

export const heightKey = 'playerPanelHeight'
export const debounceUpdate = debounce((height: number) => {
  localStorage.setItem(heightKey, height.toString());
}, 500)
export const getDefaultPanelHeight = () => {
  const storageHeight = localStorage.getItem(heightKey)
  if (storageHeight) {
    const height = parseInt(storageHeight, 10)
    return height > window.innerHeight / 2 ? window.innerHeight / 2 : height
  } else {
    return 300
  }
}

function Player(props: IProps) {
  const defaultHeight = getDefaultPanelHeight()
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  const { fullscreen, fullscreenOff, nextId, bottomBlock, activeTab, fullView } = props;
  const playerContext = React.useContext(PlayerContext);
  const isReady = playerContext.store.get().ready;
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const bottomBlockIsActive = !fullscreen && bottomBlock !== NONE;
  const [isAttached, setAttached] = React.useState(false);

  React.useEffect(() => {
    props.updateLastPlayedSession(props.sessionId);
    const parentElement = findDOMNode(screenWrapper.current) as HTMLDivElement | null; //TODO: good architecture
    if (parentElement && !isAttached) {
      playerContext.player.attach(parentElement);
      setAttached(true);
    }
  }, [isReady]);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [props.bottomBlock, props.fullscreen, playerContext.player, activeTab, fullView]);

  if (!playerContext.player) return null;

  const maxWidth = activeTab ? 'calc(100vw - 270px)' : '100vw';

  const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const diff = startHeight - deltaY;
      const max = diff > window.innerHeight / 2 ? window.innerHeight / 2 : diff;
      const newHeight = Math.max(50, max);
      setPanelHeight(newHeight);
      debounceUpdate(newHeight)
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const isInspMode = playerContext.store.get().inspectorMode;

  return (
    <div
      className={cn(stl.playerBody, 'flex-1 flex flex-col relative', fullscreen && 'pb-2')}
      data-bottom-block={bottomBlockIsActive}
    >
      {fullscreen && <EscapeButton onClose={fullscreenOff} />}
      <div className={cn('relative flex-1', 'overflow-hidden')}>
        <Overlay nextId={nextId} />
        <div className={cn(stl.screenWrapper, isInspMode ? stl.solidBg : stl.checkers)} ref={screenWrapper} />
      </div>
      {!fullscreen && !!bottomBlock && (
        <div
          style={{
            height: panelHeight,
            maxWidth,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            onMouseDown={handleResize}
            className={'w-full h-2 cursor-ns-resize absolute top-0 left-0 z-20'}
          />
          {bottomBlock === OVERVIEW && <OverviewPanel />}
          {bottomBlock === CONSOLE && <ConsolePanel />}
          {bottomBlock === NETWORK && <WebNetworkPanel panelHeight={panelHeight} />}
          {bottomBlock === STACKEVENTS && <WebStackEventPanel />}
          {bottomBlock === STORAGE && <Storage />}
          {bottomBlock === PROFILER && <ProfilerPanel panelHeight={panelHeight} />}
          {bottomBlock === PERFORMANCE && <ConnectedPerformance />}
          {bottomBlock === GRAPHQL && <GraphQL />}
          {bottomBlock === EXCEPTIONS && <Exceptions />}
        </div>
      )}
      {!fullView ? (
        <Controls
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
    bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
  }),
  {
    fullscreenOff,
    updateLastPlayedSession,
  }
)(observer(Player));
