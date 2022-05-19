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
import { Tooltip } from 'react-tippy';
import stl from './widgetWrapper.css';

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

    const [{ isDragging }, dragRef] = useDrag({
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
    }

    const onChartClick = () => {
        if (!isWidget || isPredefined) return;

        props.history.push(withSiteId(dashboardMetricDetails(dashboard?.dashboardId, widget.metricId),siteId));
    }

    const ref: any = useRef(null)
    const dragDropRef: any = dragRef(dropRef(ref))

    const addOverlay = isTemplate || (!isPredefined && isWidget)

    return useObserver(() => (
            <div
                className={
                    cn(
                        "relative rounded bg-white border group",
                        'col-span-' + widget.config.col,
                        { "hover:shadow-border-gray": !isTemplate && isWidget },
                        { "hover:shadow-border-main": isTemplate }
                    )
                }
                style={{
                    userSelect: 'none',
                    opacity: isDragging ? 0.5 : 1,
                    borderColor: (canDrop && isOver) || active ? '#394EFF' : (isPreview ? 'transparent' : '#EEEEEE'),
                }}
                ref={dragDropRef}
                onClick={props.onClick ? props.onClick : () => {}}
                id={`widget-${widget.widgetId}`}
            >
                {!isTemplate && isWidget &&
                    <div
                        className={cn(
                            stl.drillDownMessage,
                            'disabled text-gray text-sm invisible group-hover:visible')}
                        >
                            {isPredefined ? 'Cannot drill down system provided metrics' : 'Click to drill down'}
                    </div>
                }
                {/* @ts-ignore */}
                <Tooltip
                    hideOnClick={true}
                    position="bottom"
                    delay={300}
                    followCursor
                    disabled={!isTemplate}
                    boundary="viewport"
                    flip={["top"]}
                    html={<span>Click to select</span>}
                >
                    {addOverlay && <TemplateOverlay onClick={onChartClick} isTemplate={isTemplate} />}
                    <div
                        className={cn("p-3 flex items-center justify-between", { "cursor-move" : !isTemplate && isWidget })}
                    >
                        <div className="capitalize w-full font-medium">{widget.name}</div>
                        {isWidget && (
                            <div className="flex items-center" id="no-print">
                                {!isPredefined && (
                                    <>
                                        <AlertButton seriesId={widget.series[0] && widget.series[0].seriesId} />
                                        <div className='mx-2'/>
                                    </>
                                )}

                                {!isTemplate && (
                                    <ItemMenu
                                        items={[
                                            {
                                                text: widget.metricType === 'predefined' ? 'Cannot edit system generated metrics' : 'Edit',
                                                onClick: onChartClick,
                                                disabled: widget.metricType === 'predefined',
                                            },
                                            {
                                                text: 'Hide',
                                                onClick: onDelete
                                            },
                                        ]}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* <LazyLoad height={!isTemplate ? 300 : 10} offset={!isTemplate ? 100 : 10} > */}
                        <div className="px-4" onClick={onChartClick}>
                            <WidgetChart metric={widget} isTemplate={isTemplate} isWidget={isWidget} />
                        </div>
                    {/* </LazyLoad> */}
                </Tooltip>
            </div>

    ));
}


export default withRouter(WidgetWrapper);
