import { HTML5Backend } from 'react-dnd-html5-backend';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget, DndContext } from 'react-dnd';

const cardSource = {
  beginDrag(props) {
    return {
      id: props.key,
      index: props.index,
      prevIndex: props.index,
    };
  },
};

const cardTarget = {
  // eslint-disable-next-line complexity
  hover(props, monitor, component) {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    if (dragIndex === hoverIndex) {
      return;
    }
    /* eslint-disable react/no-find-dom-node */
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    const clientOffset = monitor.getClientOffset();
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    props.onDNDMove(dragIndex, hoverIndex);
    monitor.getItem().index = hoverIndex;
  },

  drop(props, monitor) {
    const dragIndex = monitor.getItem().prevIndex;
    const dropIndex = props.index;
    if (props.onDNDDrop) {
      props.onDNDDrop(dragIndex, dropIndex);
    }
  },
};

export const DNDContext = DndContext(HTML5Backend);

export const DNDSource = name => DragSource(name, cardSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));

export const DNDTarget = name => DropTarget(name, cardTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}));
