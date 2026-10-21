import cn from 'classnames';
import { FastForward, Pause, Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';

import { useStore } from 'App/mstore';

import { SKIP_INTERVALS } from '../Controls/Controls';
import cls from './PlayIconLayer.module.css';
import clsOv from './overlay.module.css';

interface Props {
  togglePlay: () => void;
  jumpInterval: (int: number) => void;
  playing: boolean;
}
const DOUBLE_TAP_DELAY = 300;

function PlayIconLayer({ playing, togglePlay, jumpInterval }: Props) {
  const { sessionStore } = useStore();
  const notesEdit = sessionStore.createNoteTooltip.isVisible;
  // which click this is: a new key replays the disc's animation
  const [bezel, setBezel] = useState(0);

  const leftLastTap = React.useRef(0);
  const rightLastTap = React.useRef(0);

  useEffect(() => {
    // TODO Find a better way to do this
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notesEdit]);

  const getIsEdit = React.useCallback(() => notesEdit, [notesEdit]);

  const onKeyDown = (e: any) => {
    if (
      getIsEdit() ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.key === ' ') {
      togglePlayAnimated();
    }
  };

  const togglePlayAnimated = useCallback(() => {
    setBezel((n) => n + 1);
    togglePlay();
  }, []);

  const doubleLeft = () => {
    jumpInterval(-SKIP_INTERVALS[15]);
  };
  const doubleRight = () => {
    jumpInterval(SKIP_INTERVALS[15]);
  };

  const onDoubleClick = (dir: 'left' | 'right') => {
    const now = Date.now();
    const lastTap = dir === 'left' ? leftLastTap : rightLastTap;
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
          {playing ? (
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
