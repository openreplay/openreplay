import cn from 'classnames';
import { FastForward, Pause, Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { debounceCall } from 'App/utils';
import cls from 'Components/Session_/Player/Overlay/PlayIconLayer.module.css';
import clsOv from 'Components/Session_/Player/Overlay/overlay.module.css';

interface Props {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onJumpForward: () => void;
  onJumpBackward: () => void;
}
const DOUBLE_TAP_DELAY = 300;

function PlayIconLayer({
  isPlaying,
  onPlay,
  onStop,
  onJumpForward,
  onJumpBackward,
}: Props) {
  const [bezel, setBezel] = useState(0);

  const leftLastTap = React.useRef(0);
  const rightLastTap = React.useRef(0);

  // the replay's bezel: it shows the state just entered and fades on its own
  const playAnimation = () => setBezel((n) => n + 1);

  const togglePlayAnimated = () => {
    playAnimation();
    isPlaying ? onStop() : onPlay();
  };

  const doubleLeft = () => {
    onJumpForward();
  };
  const doubleRight = () => {
    onJumpBackward();
  };

  const onDoubleClick = (dir: 'left' | 'right') => {
    const now = Date.now();
    const lastTap = dir === 'left' ? leftLastTap : rightLastTap;
    debounceCall(playAnimation(), DOUBLE_TAP_DELAY);
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (dir === 'left') {
        doubleLeft();
      } else {
        doubleRight();
      }
    } else {
      lastTap.current = now;
    }
  };
  return (
    <div className={clsOv.overlay} onClick={togglePlayAnimated}>
      <div
        className={cn(
          'flex items-center pl-10 lg:hidden absolute left-0 top-0',
          'h-full w-1/4 text-content-muted',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDoubleClick('left');
        }}
      >
        <FastForward className="rotate-180" size={30} />
      </div>
      <div
        className={cn(
          'flex items-center justify-end pr-10 lg:hidden absolute right-0 top-0',
          'h-full w-1/4 text-content-muted',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDoubleClick('right');
        }}
      >
        <FastForward size={30} />
      </div>
      {bezel > 0 && (
        <span key={bezel} className={cls.bezel} aria-hidden="true">
          {isPlaying ? (
            <Play size={22} fill="currentColor" />
          ) : (
            <Pause size={22} fill="currentColor" />
          )}
        </span>
      )}
    </div>
  );
}

export default observer(PlayIconLayer);
