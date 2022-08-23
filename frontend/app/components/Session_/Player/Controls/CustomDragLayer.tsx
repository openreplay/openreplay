import React, { memo } from 'react';
import { useDragLayer } from "react-dnd";
import Circle from './Circle'
import type { CSSProperties, FC } from 'react'

const layerStyles: CSSProperties = {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 100,
    left: 0,
    top: 0,
    width: "100%",
    height: "100%"
  };

const ItemTypes = {
    BOX: 'box',
}

function getItemStyles(initialOffset, currentOffset, maxX, minX) {
    if (!initialOffset || !currentOffset) {
      return {
        display: "none"
      };
    }
    let { x, y } = currentOffset;
    // if (isSnapToGrid) {
    //   x -= initialOffset.x;
    //   y -= initialOffset.y;
    //   [x, y] = [x, y];
    //   x += initialOffset.x;
    //   y += initialOffset.y;
    // }
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
    };
}

interface Props {
  onDrag: (offset: { x: number, y: number } | null) => void;
  maxX: number;
  minX: number;
}

const  CustomDragLayer: FC<Props> = memo(function CustomDragLayer(props) {
    const {
        itemType,
        isDragging,
        item,
        initialOffset,
        currentOffset,
      } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    function renderItem() {
        switch (itemType) {
          case ItemTypes.BOX:
            return <Circle />;
          default:
            return null;
        }
      }
    
    if (!isDragging) {
        return null;
    }

    if (isDragging) {
      props.onDrag(currentOffset)
    }

    return (
        <div style={layerStyles}>
          <div
            style={getItemStyles(initialOffset, currentOffset, props.maxX, props.minX)}
          >
            {renderItem()}
          </div>
        </div>
    );
})

export default CustomDragLayer;
