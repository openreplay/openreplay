import React from 'react';
import { Icon, Tooltip } from 'UI';
import stl from './timelinePointer.module.css';
import cn from 'classnames';

function TimelinePointer({ icon, content }) {
  return (
    <Tooltip title={content}>
      <div className={cn(stl.wrapper, 'flex items-center justify-center relative')}>
        <div className={stl.pin} />
        <div style={{ top: '3px' }} className={stl.icon}>
          <Icon name={icon} size="18" style={{ fill: '#D3545F' }} />
        </div>
      </div>
    </Tooltip>
  );
}

export default TimelinePointer;
