import React, { useState, useCallback, useEffect } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import cls from './PlayIconLayer.module.css';
import clsOv from './overlay.module.css';

interface Props {
  togglePlay: () => void;
  playing: boolean;
  notesEdit: boolean;
}

function PlayIconLayer({ playing, togglePlay, notesEdit }: Props) {
  const [showPlayOverlayIcon, setShowPlayOverlayIcon] = useState(false);

  useEffect(() => {
    // TODO Find a better way to do this
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notesEdit]);

  const getIsEdit = React.useCallback(() => notesEdit, [notesEdit])

  const onKeyDown = (e: any) => {
    if (getIsEdit()) return;
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

export default connect((state) => ({
  // @ts-ignore
  notesEdit: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']),
}))(PlayIconLayer);
