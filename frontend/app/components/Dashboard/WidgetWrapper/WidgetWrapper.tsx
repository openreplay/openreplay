import React, { useRef } from 'react';
import { useDashboardStore } from '../store/store';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useDrag, useDrop } from 'react-dnd';

function WidgetWrapper(props) {
    const { widget, index, moveListItem } = props;

    // useDrag - the list item is draggable
    const [{ opacity, isDragging }, dragRef] = useDrag({
        type: 'item',
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
            opacity: monitor.isDragging() ? 0.5 : 1,
        }),
    }, [index]);

    // useDrop - the list item is also a drop area
    const [spec, dropRef] = useDrop({
        accept: 'item',
        drop: (item: any) => {
            if (item.index === index) return;
            moveListItem(item.index, index);
        },
        // hover: (item: any, monitor: any) => {
        //     const dragIndex = item.index
        //     const hoverIndex = index
        //     const hoverBoundingRect = ref.current?.getBoundingClientRect()
        //     const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
        //     const hoverActualY = monitor.getClientOffset().y - hoverBoundingRect.top

        //     // if dragging down, continue only when hover is smaller than middle Y
        //     if (dragIndex < hoverIndex && hoverActualY < hoverMiddleY) return
        //     // if dragging up, continue only when hover is bigger than middle Y
        //     if (dragIndex > hoverIndex && hoverActualY > hoverMiddleY) return

        //     moveListItem(dragIndex, hoverIndex)
        //     item.index = hoverIndex
        // },
    }, [])

    console.log('spec', spec)

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))
    
    return (
        <div
            className={cn("border rounded bg-white", 'col-span-' + widget.colSpan)}
            style={{ userSelect: 'none', opacity }}
            ref={dragDropRef}
        >
            {/* <Link to={withSiteId(dashboardMetricDetails(dashboard.dashboardId, widget.widgetId), siteId)}> */}
                <div
                    className="p-3 cursor-move border-b flex items-center justify-between"
                >
                    {widget.name} - {widget.position}
                    <div>
                        <ItemMenu
                            items={[
                                {
                                    text: 'Edit',
                                    onClick: () => {
                                        console.log('edit');
                                    }
                                },
                            ]}
                        />
                        {/* <button className="btn btn-sm btn-outline-primary" onClick={() => dashboard.removeWidget(widget.widgetId)}>
                            remove
                        </button> */}
                    </div>
                </div>

                <div className="h-40">

                </div>
            {/* </Link> */}
        </div>
    );
}

export default WidgetWrapper;