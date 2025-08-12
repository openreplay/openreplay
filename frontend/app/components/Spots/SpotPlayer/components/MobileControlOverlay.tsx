import React, { useState } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import cls from 'Components/Session_/Player/Overlay/PlayIconLayer.module.css';
import clsOv from 'Components/Session_/Player/Overlay/overlay.module.css';
import { FastForward } from 'lucide-react';
import { debounceCall } from 'App/utils';

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
  const [showPlayOverlayIcon, setShowPlayOverlayIcon] = useState(false);

  const leftLastTap = React.useRef(0);
  const rightLastTap = React.useRef(0);

  const playAnimation = () => {
    setShowPlayOverlayIcon(true);
    setTimeout(() => setShowPlayOverlayIcon(false), 500);
  };

  const togglePlayAnimated = () => {
    playAnimation();
    isPlaying ? onStop() : onPlay();
  }

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
    <div
      className={cn(
        clsOv.overlay,
        'relative. transition-all',
        showPlayOverlayIcon
          ? 'opacity-100 bg-[rgba(0,0,0,0.1)]'
          : 'opacity-0 bg-transparent',
      )}
      onClick={togglePlayAnimated}
    >
      <div
        className={cn(
          'flex items-center pl-10 lg:hidden absolute left-0 top-0',
          'h-full w-1/4 text-gray-medium',
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
          'h-full w-1/4 text-gray-medium',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDoubleClick('right');
        }}
      >
        <FastForward size={30} />
      </div>
      <div
        className={cn(cls.iconWrapper, {
          [cls.zoomIcon]: showPlayOverlayIcon,
        })}
      >
        <Icon name={isPlaying ? 'play' : 'pause'} color="gray-medium" size={30} />
      </div>
    </div>
  );
}

export default observer(PlayIconLayer);
