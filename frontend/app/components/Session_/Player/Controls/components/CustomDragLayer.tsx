import React, { memo, useEffect } from 'react';
import type { CSSProperties, FC } from 'react'
import { useDragLayer, XYCoord } from "react-dnd";
import Circle from './Circle'

const layerStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: 100,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%"
}


function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  maxX: number,
  minX: number,
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none"
    }
  }
  let { x } = currentOffset;
  if (x > maxX) {
    x = maxX;
  }

  if (x < minX) {
    x = minX;
  }
  const transform = `translate(${x}px, ${initialOffset.y}px)`;
  return {
    transition: 'transform 0.1s ease-out',
    transform,
    WebkitTransform: transform
  }
}

export type OnDragCallback = (offset: XYCoord) => void

interface Props {
  onDrag: OnDragCallback
  maxX: number
  minX: number
}

const CustomDragLayer: FC<Props> = memo(function CustomDragLayer({ maxX, minX, onDrag }) {
  const {
      isDragging,
      initialOffset,
      currentOffset, // might be null (why is it not captured by types?)
    } = useDragLayer((monitor) => ({
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
  }))

  useEffect(() => {
    if (!isDragging || !currentOffset?.x) {
      return
    }
    onDrag(currentOffset)
  }, [isDragging, currentOffset])

  if (!isDragging || !currentOffset) {
      return null;
  }

  return (
      <div style={layerStyles}>
        <div
          style={getItemStyles(initialOffset, currentOffset, maxX, minX)}
        >
          <Circle />
        </div>
      </div>
  )
})

export default CustomDragLayer;
