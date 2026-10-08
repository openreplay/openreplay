import React, { CSSProperties, FC, memo, useEffect } from 'react';
import type { DragSourceMonitor } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { ProgressCircle } from 'App/player-ui';

function getStyles(left: number, isDragging: boolean): CSSProperties {
  const leftPosition = left > 100 ? 100 : left;

  return {
    position: 'absolute',
    top: 0,
    left: `${leftPosition}%`,
    opacity: isDragging ? 0 : 1,
    height: isDragging ? 0 : '100%',
    zIndex: 99,
    cursor: 'move',
  };
}

const ItemTypes = {
  BOX: 'box',
};

interface Props {
  left: number;
  live?: boolean;
  onDrop?: () => void;
  paused?: boolean;
}

const DraggableCircle: FC<Props> = memo(({ left, live, onDrop, paused }) => {
  const [{ isDragging }, dragRef, preview] = useDrag(
    () => ({
      type: ItemTypes.BOX,
      item: { left },
      end: onDrop,
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
        item: monitor.getItem(),
      }),
    }),
    [left],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  return (
    <div ref={dragRef} style={getStyles(left, isDragging)} role="DraggableBox">
      <ProgressCircle paused={paused} isGreen={left > 99 && live} />
    </div>
  );
});

export default DraggableCircle;
