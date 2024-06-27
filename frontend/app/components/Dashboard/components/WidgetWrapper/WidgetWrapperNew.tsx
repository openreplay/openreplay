import React, {useRef} from 'react';
import cn from 'classnames';
import {Card, Tooltip, Button} from 'antd';
import {useDrag, useDrop} from 'react-dnd';
import WidgetChart from '../WidgetChart';
import {observer} from 'mobx-react-lite';
import {useStore} from 'App/mstore';
import {withRouter, RouteComponentProps} from 'react-router-dom';
import {withSiteId, dashboardMetricDetails} from 'App/routes';
import TemplateOverlay from './TemplateOverlay';
import stl from './widgetWrapper.module.css';
import {FilterKey} from 'App/types/filter/filterType';
import LazyLoad from 'react-lazyload';
import {TIMESERIES} from "App/constants/card";
import CardMenu from "Components/Dashboard/components/WidgetWrapper/CardMenu";
import AlertButton from "Components/Dashboard/components/WidgetWrapper/AlertButton";

interface Props {
    className?: string;
    widget?: any;
    index?: number;
    moveListItem?: any;
    isPreview?: boolean;
    isTemplate?: boolean;
    dashboardId?: string;
    siteId?: string;
    active?: boolean;
    history?: any;
    onClick?: () => void;
    isWidget?: boolean;
    hideName?: boolean;
    grid?: string;
    isGridView?: boolean;
}

function WidgetWrapperNew(props: Props & RouteComponentProps) {
    const {dashboardStore} = useStore();
    const {
        isWidget = false,
        active = false,
        index = 0,
        moveListItem = null,
        isPreview = false,
        isTemplate = false,
        siteId,
        grid = '',
        isGridView = false,
    } = props;
    const widget: any = props.widget;
    const isTimeSeries = widget.metricType === TIMESERIES;
    const isPredefined = widget.metricType === 'predefined';
    const dashboard = dashboardStore.selectedDashboard;

    const [{isDragging}, dragRef] = useDrag({
        type: 'item',
        item: {index, grid},
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{isOver, canDrop}, dropRef] = useDrop({
        accept: 'item',
        drop: (item: any) => {
            if (item.index === index || item.grid !== grid) return;
            moveListItem(item.index, index);
        },
        canDrop(item) {
            return item.grid === grid;
        },
        collect: (monitor: any) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const onChartClick = () => {
        if (!isWidget || isPredefined) return;
        props.history.push(
            withSiteId(dashboardMetricDetails(dashboard?.dashboardId, widget.metricId), siteId)
        );
    };

    const ref: any = useRef(null);
    const dragDropRef: any = dragRef(dropRef(ref));
    const addOverlay =
        isTemplate ||
        (!isPredefined &&
            isWidget &&
            widget.metricOf !== FilterKey.ERRORS &&
            widget.metricOf !== FilterKey.SESSIONS);

    return (
        <Card
            className={cn(
                'relative group rounded-lg',
                'col-span-' + widget.config.col,
                {'hover:shadow-sm': !isTemplate && isWidget},
            )}
            style={{
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
                borderColor:
                    (canDrop && isOver) || active ? '#394EFF' : isPreview ? 'transparent' : '#EEEEEE',
            }}
            ref={dragDropRef}
            onClick={props.onClick ? props.onClick : () => null}
            id={`widget-${widget.widgetId}`}
            title={!props.hideName ? widget.name : null}
            extra={isWidget ? [
                <div className="flex items-center" id="no-print">
                    {!isPredefined && isTimeSeries && !isGridView && (
                        <AlertButton seriesId={widget.series[0] && widget.series[0].seriesId}/>
                    )}

                    {!isTemplate && !isGridView && (
                        <CardMenu card={widget} key="card-menu"/>
                    )}
                </div>
            ] : []}
            styles={{
                header: {
                    padding: '0 14px',
                    borderBottom: 'none',
                    minHeight: 44,
                    fontWeight: 500,
                    fontSize: 14,
                },
                body: {
                    padding: 0,
                },
            }}
        >
            {!isTemplate && isWidget && isPredefined && (
                <Tooltip title="Cannot drill down system provided metrics">
                    <div
                        className={cn(stl.drillDownMessage, 'disabled text-gray text-sm invisible group-hover:visible')}>
                        {'Cannot drill down system provided metrics'}
                    </div>
                </Tooltip>
            )}

            {addOverlay && <TemplateOverlay onClick={onChartClick} isTemplate={isTemplate}/>}

            <LazyLoad offset={!isTemplate ? 100 : 600}>
                <div className="px-4" onClick={onChartClick}>
                    <WidgetChart
                        isPreview={isPreview}
                        metric={widget}
                        isTemplate={isTemplate}
                        isWidget={isWidget}
                    />
                </div>
            </LazyLoad>
        </Card>
    );
}

export default withRouter(observer(WidgetWrapperNew));
