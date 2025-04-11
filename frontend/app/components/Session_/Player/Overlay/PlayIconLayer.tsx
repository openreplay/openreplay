import React, { useState, useCallback, useEffect } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import cls from './PlayIconLayer.module.css';
import clsOv from './overlay.module.css';

interface Props {
  togglePlay: () => void;
  playing: boolean;
}

function PlayIconLayer({ playing, togglePlay }: Props) {
  const { sessionStore } = useStore();
  const notesEdit = sessionStore.createNoteTooltip.isVisible;
  const [showPlayOverlayIcon, setShowPlayOverlayIcon] = useState(false);

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
    setShowPlayOverlayIcon(true);
    togglePlay();
    setTimeout(() => setShowPlayOverlayIcon(false), 800);
  }, []);

  return (
    <div className={clsOv.overlay} onClick={togglePlayAnimated}>
      <div
        className={cn(cls.iconWrapper, {
          [cls.zoomIcon]: showPlayOverlayIcon,
        })}
      >
        <Icon name={playing ? 'play' : 'pause'} color="gray-medium" size={30} />
      </div>
    </div>
  );
}

export default observer(PlayIconLayer);
