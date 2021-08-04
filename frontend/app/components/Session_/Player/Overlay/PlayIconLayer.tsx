import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

import cls from './PlayIconLayer.css';
import clsOv from './overlay.css';

interface Props {
  togglePlay: () => void,
  playing: boolean,
}

export default function PlayIconLayer({ playing, togglePlay }: Props) {
  const [ showPlayOverlayIcon, setShowPlayOverlayIcon ] = useState(false);
  const togglePlayAnimated = useCallback(() => {
    setShowPlayOverlayIcon(true);
    togglePlay();
    setTimeout(
      () => setShowPlayOverlayIcon(false),
      800,
    );
  }, []);
  return (
    <div className={ clsOv.overlay } onClick={ togglePlayAnimated }>
      <div 
        className={ cn(cls.iconWrapper, { 
          [ cls.zoomIcon ]: showPlayOverlayIcon 
        }) } 
      >
        <Icon 
          name={ playing ? "play" : "pause" } 
          color="gray-medium"
          size={30}
        />
      </div>
    </div>
  )
}