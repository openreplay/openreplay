import React, { useEffect, useRef } from 'react';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useDrag, useDrop } from 'react-dnd';
import WidgetChart from '../WidgetChart';
import { useObserver } from 'mobx-react-lite';
import { confirm } from 'UI/Confirmation';
import { useStore } from 'App/mstore';

interface Props {
    className?: string;
    widget?: any;
    index?: number;
    moveListItem?: any;
    isPreview?: boolean;
    dashboardId?: string;
}
function WidgetWrapper(props: Props) {
    const { dashboardStore } = useStore();
    const { widget, index = 0, moveListItem = null, isPreview = false, dashboardId } = props;

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

    const onDelete = async () => {
        if (await confirm({
          header: 'Confirm',
          confirmButton: 'Yes, Delete',
          confirmation: `Are you sure you want to permanently delete this Dashboard?`
        })) {
            dashboardStore.deleteDashboardWidget(dashboardId!, widget.widgetId).then(() => {

            })
        }
    }

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))
    
    return useObserver(() => (
        <div
            className={cn("rounded bg-white", 'col-span-' + widget.colSpan, { 'border' : !isPreview })}
            style={{
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
                borderColor: canDrop && isOver ? '#394EFF' : '',
            }}
            ref={dragDropRef}
        >
            {/* <Link to={withSiteId(dashboardMetricDetails(dashboard.dashboardId, widget.widgetId), siteId)}> */}
                <div
                    className="p-3 cursor-move border-b flex items-center justify-between"
                >
                    {widget.name}
                    <div>
                        <ItemMenu
                            items={[
                                {
                                    text: 'Edit',
                                    onClick: () => {
                                        console.log('edit');
                                    }
                                },
                                {
                                    text: 'Hide from view' + dashboardId,
                                    onClick: onDelete
                                },
                            ]}
                        />
                    </div>
                </div>

                <div className="">
                    <WidgetChart />
                </div>
            {/* </Link> */}
        </div>
    ));
}

export default WidgetWrapper;