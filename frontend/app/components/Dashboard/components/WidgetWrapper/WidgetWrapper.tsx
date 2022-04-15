import React, { useEffect, useRef } from 'react';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useDrag, useDrop } from 'react-dnd';
import WidgetChart from '../WidgetChart';
import { useObserver } from 'mobx-react-lite';
// import { confirm } from 'UI/Confirmation';
import { useStore } from 'App/mstore';
import LazyLoad from 'react-lazyload';
import { withRouter } from 'react-router-dom';
import { withSiteId, dashboardMetricDetails } from 'App/routes';
import TemplateOverlay from './TemplateOverlay';
import WidgetIcon from './WidgetIcon';
import AlertButton from './AlertButton';

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
    onClick?: () => void;
    isWidget?: boolean;
}
function WidgetWrapper(props: Props) {
    const { dashboardStore } = useStore();
    const { isWidget = false, active = false, index = 0, moveListItem = null, isPreview = false, isTemplate = false, dashboardId, siteId } = props;
    const widget: any = useObserver(() => props.widget);    
    const isPredefined = widget.metricType === 'predefined';
    const dashboard = useObserver(() => dashboardStore.selectedDashboard);

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
        dashboardStore.deleteDashboardWidget(dashboard?.dashboardId, widget.widgetId);
        // if (await confirm({
        //   header: 'Confirm',
        //   confirmButton: 'Yes, delete',
        //   confirmation: `Are you sure you want to permanently delete the widget from this dashboard?`
        // })) {
        //     dashboardStore.deleteDashboardWidget(dashboardId!, widget.widgetId);
        // }
    }

    const onChartClick = () => {
        if (!isWidget || isPredefined) return;
        
        props.history.push(withSiteId(dashboardMetricDetails(dashboardId, widget.metricId),siteId));
    }

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))
    
    return useObserver(() => (
        <div
            className={cn("relative rounded bg-white border", 'col-span-' + widget.config.col, { "cursor-pointer" : isTemplate })}
            style={{
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
                borderColor: (canDrop && isOver) || active ? '#394EFF' : (isPreview ? 'transparent' : '#EEEEEE'),
            }}
            ref={dragDropRef}
            onClick={props.onClick ? props.onClick : () => {}}
        >
            {isTemplate && <TemplateOverlay />}
            <div
                className={cn("p-3 flex items-center justify-between", { "cursor-move" : !isTemplate })}
            >
                <h3 className="capitalize">{widget.name}</h3>
                {isWidget && (
                    <div className="flex items-center">
                        {!isPredefined && (
                            <>
                                <AlertButton seriesId={widget.series[0] && widget.series[0].seriesId} />
                                <div className='mx-2'/>
                            </>
                        )}
                        
                        <ItemMenu
                            items={[
                                {
                                    text: 'Edit', onClick: onChartClick,
                                    disabled: widget.metricType === 'predefined',
                                    disabledMessage: 'Cannot edit system generated metrics'
                                },
                                {
                                    text: 'Remove from view',
                                    onClick: onDelete
                                },
                            ]}
                        />
                    </div>
                )}
            </div>

            <LazyLoad height={100} offset={120} >
                <div className="px-4" onClick={onChartClick}>
                    <WidgetChart metric={widget} isWidget={isWidget} />
                </div>
            </LazyLoad>
        </div>
    ));
}

export default withRouter(WidgetWrapper);