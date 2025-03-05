import React, { useEffect } from 'react';
import cn from 'classnames';
import stl from 'Components/Session_/Player/player.module.css';
import {
  IPlayerContext,
  PlayerContext,
} from 'Components/Session/playerContext';
import ClipPlayerControls from 'Components/Session/Player/ClipPlayer/ClipPlayerControls';
import Session from 'Types/session';
import styles from 'Components/Session_/playerBlock.module.css';
import ClipPlayerOverlay from 'Components/Session/Player/ClipPlayer/ClipPlayerOverlay';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';

interface Props {
  session: Session;
  range: [number, number];
  autoplay: boolean;
  isHighlight?: boolean;
  message?: string;
  isMobile?: boolean;
}

function ClipPlayerContent(props: Props) {
  const playerContext = React.useContext<IPlayerContext>(PlayerContext);
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const { time } = playerContext.store.get();
  const { range } = props;

  React.useEffect(() => {
    if (!playerContext.player) return;

    const parentElement = screenWrapper.current;

    if (parentElement && playerContext.player) {
      playerContext.player?.attach(parentElement);
      playerContext.player?.play();
    }
  }, [playerContext.player]);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [playerContext.player]);

  useEffect(() => {
    if (time < range[0]) {
      playerContext.player?.jump(range[0]);
    }
    if (time > range[1]) {
      playerContext.store.update({ completed: true });
      playerContext.player?.pause();
    }
  }, [time]);

  if (!playerContext.player) return null;

  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}
    >
      <div className={cn(stl.playerBody, 'flex-1 flex flex-col relative')}>
        <div className={cn(stl.playerBody, 'flex flex-1 flex-col relative')}>
          <div className="relative flex-1 overflow-hidden group">
            <ClipPlayerOverlay autoplay={props.autoplay} />
            <div
              className={cn(stl.screenWrapper, stl.checkers)}
              ref={screenWrapper}
              data-openreplay-obscured
              style={{ height: '500px' }}
            />
          </div>
        </div>
        {props.isHighlight && props.message ? (
          <div
            className="shadow-inner p-3 flex gap-2 w-full items-center"
            style={{ background: 'rgba(252, 193, 0, 0.2)' }}
          >
            <Icon name="chat-square-quote" color="inherit" size={18} />
            <div className="leading-none font-medium">{props.message}</div>
          </div>
        ) : null}
        <ClipPlayerControls session={props.session} range={props.range} />
      </div>
    </div>
  );
}

export default observer(ClipPlayerContent);
