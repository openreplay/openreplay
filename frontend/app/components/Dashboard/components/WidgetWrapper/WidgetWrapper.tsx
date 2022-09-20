import React, { useRef } from 'react';
import cn from 'classnames';
import { ItemMenu, Popup } from 'UI';
import { useDrag, useDrop } from 'react-dnd';
import WidgetChart from '../WidgetChart';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId, dashboardMetricDetails } from 'App/routes';
import TemplateOverlay from './TemplateOverlay';
import AlertButton from './AlertButton';
import stl from './widgetWrapper.module.css';
import { FilterKey } from 'App/types/filter/filterType';

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
    hideName?: boolean;
    grid?: string;
}
function WidgetWrapper(props: Props & RouteComponentProps) {
    const { dashboardStore } = useStore();
    const { isWidget = false, active = false, index = 0, moveListItem = null, isPreview = false, isTemplate = false, siteId, grid = "" } = props;
    const widget: any = props.widget;
    const isTimeSeries = widget.metricType === 'timeseries';
    const isPredefined = widget.metricType === 'predefined';
    const dashboard = dashboardStore.selectedDashboard;

    const [{ isDragging }, dragRef] = useDrag({
        type: 'item',
        item: { index, grid },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
            opacity: monitor.isDragging() ? 0.5 : 1,
        }),
    });

    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: 'item',
        drop: (item: any) => {
            if (item.index === index || (item.grid !== grid)) return;
            moveListItem(item.index, index);
        },
        canDrop(item) {
            return item.grid === grid
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
    const addOverlay = isTemplate || (!isPredefined && isWidget && widget.metricOf !== FilterKey.ERRORS && widget.metricOf !== FilterKey.SESSIONS)

    return (
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
                {!isTemplate && isWidget && isPredefined &&
                    <div
                        className={cn(
                            stl.drillDownMessage,
                            'disabled text-gray text-sm invisible group-hover:visible')}
                        >
                            {'Cannot drill down system provided metrics'}
                    </div>
                }
                {/* @ts-ignore */}
                <Popup
                    hideOnClick={true}
                    position="bottom"
                    delay={300}
                    followCursor
                    disabled={!isTemplate}
                    boundary="viewport"
                    flip={["top"]}
                    content={<span>Click to select</span>}
                >
                    {addOverlay && <TemplateOverlay onClick={onChartClick} isTemplate={isTemplate} />}
                    <div
                        className={cn("p-3 pb-4 flex items-center justify-between", { "cursor-move" : !isTemplate && isWidget })}
                    >
                        {!props.hideName ? <div className="capitalize-first w-full font-medium">{widget.name}</div> : null}
                        {isWidget && (
                            <div className="flex items-center" id="no-print">
                                {!isPredefined && isTimeSeries && (
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
                </Popup>
            </div>

    );
}


export default withRouter(observer(WidgetWrapper));
