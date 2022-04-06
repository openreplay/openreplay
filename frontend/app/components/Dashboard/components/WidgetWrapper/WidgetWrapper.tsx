import React, { useEffect, useRef } from 'react';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useDrag, useDrop } from 'react-dnd';
import WidgetChart from '../WidgetChart';
import { useObserver } from 'mobx-react-lite';
import { confirm } from 'UI/Confirmation';
import { useStore } from 'App/mstore';
import LazyLoad from 'react-lazyload';
import { withRouter } from 'react-router-dom';
import { withSiteId, dashboardMetricDetails } from 'App/routes';

interface Props {
    className?: string;
    widget?: any;
    index?: number;
    moveListItem?: any;
    isPreview?: boolean;
    isTemplate?: boolean
    dashboardId?: string;
    siteId?: string,
    active?: boolean;
    history?: any
}
function WidgetWrapper(props: Props) {
    const { dashboardStore } = useStore();
    const { active = false, widget, index = 0, moveListItem = null, isPreview = false, isTemplate = false, dashboardId, siteId } = props;

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
            dashboardStore.deleteDashboardWidget(dashboardId!, widget.widgetId);
        }
    }

    const editHandler = () => {
        console.log('clicked', widget.metricId);
    }

    const onChartClick = () => {
        if (isPreview || isTemplate) return;
        props.history.push(withSiteId(dashboardMetricDetails(dashboardId, widget.metricId),siteId));
    }

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))
    
    return useObserver(() => (
        <div
            className={cn("rounded bg-white border", 'col-span-' + widget.config.col)}
            style={{
                // borderColor: 'transparent'
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
                borderColor: (canDrop && isOver) || active ? '#394EFF' : (isPreview ? 'transparent' : '#EEEEEE'),
            }}
            ref={dragDropRef}
        >
            <div
                className="p-3 cursor-move flex items-center justify-between"
            >
                
                <h3 className="capitalize">{widget.name}</h3>
                {!isPreview && !isTemplate && (
                    <div>
                        <ItemMenu
                            items={[
                                {
                                    text: 'Edit', onClick: editHandler,
                                },
                                {
                                    text: 'Hide from view',
                                    onClick: onDelete
                                },
                            ]}
                        />
                    </div>
                )}
            </div>

            <LazyLoad height={300} offset={320} >
                <div className="px-2" onClick={onChartClick}>
                    <WidgetChart metric={props.widget}/>
                </div>
            </LazyLoad>
        </div>
    ));
}

export default withRouter(WidgetWrapper);