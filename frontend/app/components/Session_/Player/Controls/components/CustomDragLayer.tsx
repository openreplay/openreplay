import React, { memo, useEffect, useMemo } from 'react';
import type { CSSProperties, FC, RefObject } from 'react';
import { XYCoord, useDragLayer } from 'react-dnd';

import Circle from './Circle';

const layerStyles: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  box: DOMRect | null,
) {
  if (!initialOffset || !currentOffset || !box) {
    return {
      display: 'none',
    };
  }
  const x = Math.min(box.right, Math.max(box.left, currentOffset.x));
  const transform = `translate(${x}px, ${initialOffset.y}px)`;
  return {
    transition: 'transform 0.1s ease-out',
    transform,
    WebkitTransform: transform,
  };
}

/** `x` is relative to the bar's left edge, clamped to its width. */
export type OnDragCallback = (offset: XYCoord) => void;

interface Props {
  onDrag: OnDragCallback;
  /** the bar being scrubbed; offsets are reported relative to it */
  containerRef: RefObject<HTMLElement | null>;
}

const CustomDragLayer: FC<Props> = memo(({ containerRef, onDrag }) => {
  const {
    isDragging,
    initialOffset,
    currentOffset, // might be null (why is it not captured by types?)
  } = useDragLayer((monitor) => ({
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));
  // the bar can't move while the pointer holds the handle: measure once per drag
  const box = useMemo(
    () =>
      isDragging
        ? (containerRef.current?.getBoundingClientRect() ?? null)
        : null,
    [isDragging],
  );

  useEffect(() => {
    if (!isDragging || !currentOffset || !box) {
      return;
    }
    onDrag({
      x: Math.min(box.width, Math.max(0, currentOffset.x - box.left)),
      y: currentOffset.y,
    });
  }, [isDragging, currentOffset]);

  if (!isDragging || !currentOffset) {
    return null;
  }

  return (
    <div id="drag-layer" style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset, box)}>
        <Circle />
      </div>
    </div>
  );
});

CustomDragLayer.displayName = 'CustomDragLayer';

export default CustomDragLayer;
