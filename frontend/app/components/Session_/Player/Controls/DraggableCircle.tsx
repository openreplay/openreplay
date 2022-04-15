import React, { memo, FC, useEffect, useRef, CSSProperties } from 'react';
import type { DragSourceMonitor } from 'react-dnd'
import { useDrag } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import Circle from './Circle'

function getStyles(
    left: number,
    isDragging: boolean,
  ): CSSProperties {
    // const transform = `translate3d(${(left * 1161) / 100}px, -8px, 0)`
    return {
        position: 'absolute',
        top: '-3px',
        left: `${left}%`,
        // transform,
        // WebkitTransform: transform,
        // IE fallback: hide the real node using CSS when dragging
        // because IE will ignore our custom "empty image" drag preview.
        opacity: isDragging ? 0 : 1,
        height: isDragging ? 0 : '',
        zIndex: '99999',
        cursor: 'move'
    }
}

const ItemTypes = {
    BOX: 'box',
}

interface Props {
    left: number;
    top: number;
    onDrop?: (item, monitor) => void;
}

const DraggableCircle: FC<Props> = memo(function DraggableCircle(props) {
    const { left, top } = props
    const [{ isDragging, item }, dragRef, preview] = useDrag(
        () => ({
            type: ItemTypes.BOX,
            item: { left, top },
            end: props.onDrop,
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
                item: monitor.getItem(),
            }),
        }),
        [left, top],
    )

    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true })
    }, [])
    
    return (
        <div
            ref={dragRef}
            style={getStyles(left, isDragging)}
            role="DraggableBox"
        >
            <Circle />
        </div>
    );
})

export default DraggableCircle