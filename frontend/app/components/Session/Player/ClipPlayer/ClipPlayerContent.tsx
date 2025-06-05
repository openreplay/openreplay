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
import { Empty } from 'antd';

interface Props {
  session: Session;
  range: [number, number];
  autoplay: boolean;
  isHighlight?: boolean;
  message?: string;
  isMobile?: boolean;
  isFull?: boolean;
}

function ClipPlayerContent(props: Props) {
  const playerContext = React.useContext<IPlayerContext>(PlayerContext);
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const { time, error } = playerContext.store.get();
  const { range, isFull, isHighlight } = props;

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

  const outerHeight = props.isHighlight ? 556 + 39 : 556;
  const innerHeight = props.isHighlight ? 504 + 39 : 504;
  return error ? (
    <div
      className="inset-0 flex items-center justify-center absolute"
      style={{ height: 'auto' }}
    >
      <div className="flex flex-col items-center">
        <Empty description="Session not found." />
      </div>
    </div>
  ) : (
    <div
      className={cn(
        styles.playerBlock,
        'flex flex-col',
        `overflow-x-hidden max-h-[${outerHeight}px] h-[${outerHeight}px]`,
      )}
    >
      <div
        className={cn(
          stl.playerBody,
          `flex-1 flex flex-col relative max-h-[${innerHeight}px] h-[${innerHeight}px]`,
        )}
      >
        <div className={cn(stl.playerBody, 'flex flex-1 flex-col relative')}>
          <div className="relative flex-1 overflow-hidden group">
            <ClipPlayerOverlay
              isHighlight={isHighlight}
              autoplay={props.autoplay}
            />
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
        <ClipPlayerControls
          isFull={isFull}
          session={props.session}
          range={props.range}
        />
      </div>
    </div>
  );
}

export default observer(ClipPlayerContent);
