import React, { useRef } from 'react';
import { useDashboardStore } from '../store/store';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useDrag, useDrop } from 'react-dnd';

interface Props {
    className?: string;
    widget?: any;
    index?: number;
    moveListItem?: any;
    isPreview?: boolean;
}
function WidgetWrapper(props: Props) {
    const { widget = {}, index = 0, moveListItem = null, isPreview = false } = props;

    const [{ opacity, isDragging }, dragRef] = useDrag({
        type: 'item',
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
            opacity: monitor.isDragging() ? 0.5 : 1,
        }),

    });

    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: 'item',

        drop: (item: any) => {
            if (item.index === index) return;
            moveListItem(item.index, index);
        },
        collect: (monitor: any) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    })

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))
    
    return (
        <div
            className={cn("rounded bg-white", 'col-span-' + widget.colSpan, { 'border' : !isPreview })}
            style={{
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
                borderColor: canDrop && isOver ? '#394EFF' : '#EEE',
            }}
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