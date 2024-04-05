import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import React from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import LiveControls from './LiveControls';
import ConsolePanel from 'Shared/DevTools/ConsolePanel';
import { observer } from 'mobx-react-lite';
import Overlay from './Overlay';
import stl from 'Components/Session_/Player/player.module.css';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { CONSOLE } from 'Duck/components/player';

interface IProps {
  closedLive: boolean;
  fullView: boolean;
  isMultiview?: boolean;
  bottomBlock: number;
}

function Player(props: IProps) {
  const defaultHeight = getDefaultPanelHeight();
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  const { closedLive, fullView, isMultiview, bottomBlock } = props;
  // @ts-ignore TODO
  const playerContext = React.useContext<ILivePlayerContext>(PlayerContext);
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const ready = playerContext.store.get().ready;

  React.useEffect(() => {
    if (!props.closedLive || isMultiview) {
      const parentElement = findDOMNode(screenWrapper.current) as HTMLDivElement | null; //TODO: good architecture
      if (parentElement) {
        playerContext.player.attach(parentElement);
        playerContext.player.play();
      }
    }
  }, []);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [playerContext.player, ready]);

  if (!playerContext.player) return null;

  const maxWidth = '100vw';

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
      playerContext.player.scale();
      debounceUpdate(newHeight);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={cn(stl.playerBody, 'flex flex-1 flex-col relative')}>
      <div className="relative flex-1 overflow-hidden">
        <Overlay closedLive={closedLive} />
        <div className={cn(stl.screenWrapper, stl.checkers)} ref={screenWrapper} />
      </div>
      {bottomBlock === CONSOLE ? (
        <div style={{ maxWidth, width: '100%', height: panelHeight, position: 'relative', overflow: 'hidden' }}>
          <div
            onMouseDown={handleResize}
            className={'w-full h-2 cursor-ns-resize absolute top-0 left-0 z-20'}
          >
            <ConsolePanel isLive />
          </div>
        </div>
      ) : null}
      {!fullView && !isMultiview ? <LiveControls jump={playerContext.player.jump} /> : null}
    </div>
  );
}

export default connect((state: any) => {
  const isAssist = window.location.pathname.includes('/assist/');
  return {
    sessionId: state.getIn(['sessions', 'current']).sessionId,
    bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
    closedLive:
      !!state.getIn(['sessions', 'errors']) ||
      (isAssist && !state.getIn(['sessions', 'current']).live),
  };
})(observer(Player));
