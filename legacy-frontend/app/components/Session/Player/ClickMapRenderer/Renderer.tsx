import React from 'react';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import Overlay from 'Components/Session_/Player/Overlay';
import stl from 'Components/Session_/Player/player.module.css';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite'

function Player() {
  const playerContext = React.useContext(PlayerContext);
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const parentElement = findDOMNode(screenWrapper.current) as HTMLDivElement | null;
    if (parentElement) {
      playerContext.player.attach(parentElement);
    }
  }, []);

  if (!playerContext.player) return null;

  return (
    <div
      className={cn(stl.playerBody, 'flex-1 flex flex-col relative')}
    >
      <div className={cn("relative flex-1", 'overflow-visible')}>
        <Overlay isClickmap />
        <div className={cn(stl.screenWrapper, stl.checkers, '!overflow-y-scroll')} style={{ maxHeight: 800 }} ref={screenWrapper} />
      </div>
    </div>
  );
}

export default observer(Player);
