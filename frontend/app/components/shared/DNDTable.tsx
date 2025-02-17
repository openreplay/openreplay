import React, { useRef, useState, useCallback } from 'react';
import { Table } from 'antd';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical } from 'lucide-react';

const type = 'COLUMN';

function DraggableHeaderCell({ index, moveColumn, children, ...rest }) {
  const ref = useRef<HTMLTableHeaderCellElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const [, drop] = useDrop({
    accept: type,
    hover: (item, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      if (dragIndex === index) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      if (dragIndex < index && hoverClientX < hoverMiddleX) return;
      if (dragIndex > index && hoverClientX > hoverMiddleX) return;
      moveColumn(dragIndex, index);
      item.index = index;
    },
  });
  drag(drop(ref));
  return (
    <th
      ref={ref}
      {...rest}
      style={{
        ...rest.style,
        cursor: 'default',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div className="flex items-center gap-1">
        <div className={'cursor-grab'}>
          <GripVertical size={16} />
        </div>
        {children}
      </div>
    </th>
  );
}

const DNDTable = ({ columns: initCols, onOrderChange, ...tableProps }) => {
  const [cols, setCols] = useState(initCols);

  const moveColumn = useCallback(
    (dragIndex, hoverIndex) => {
      const updated = [...cols];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      setCols(updated);
      onOrderChange?.(updated);
    },
    [cols, onOrderChange]
  );

  const components = {
    header: {
      cell: (cellProps) => {
        const i = cols.findIndex((c) => c.key === cellProps['data-col-key']);
        const isOptionsCell = cellProps['data-col-key'] === '$__opts__$';
        return !isOptionsCell && i > -1 ? (
          <DraggableHeaderCell
            {...cellProps}
            index={i}
            moveColumn={moveColumn}
          />
        ) : (
          <th {...cellProps} />
        );
      },
    },
  };

  const mergedCols = cols.map((col) => ({
    ...col,
    onHeaderCell: () => ({ 'data-col-key': col.key }),
  }));

  return (
    <DndProvider backend={HTML5Backend}>
      <Table {...tableProps} columns={mergedCols} components={components} />
    </DndProvider>
  );
};

export default DNDTable;
