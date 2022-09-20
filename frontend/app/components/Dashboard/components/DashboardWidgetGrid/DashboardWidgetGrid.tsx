import React from 'react';
import { toJS } from 'mobx'
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Loader, Icon } from 'UI';
import { useObserver } from 'mobx-react-lite';
import AddMetricContainer from './AddMetricContainer'
import Widget from 'App/mstore/types/widget';

interface Props {
    siteId: string,
    dashboardId: string;
    onEditHandler: () => void;
    id?: string;
}
function DashboardWidgetGrid(props: Props) {
    const { dashboardId, siteId } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const dashboard = dashboardStore.selectedDashboard;
    const list = useObserver(() => dashboard?.widgets);
    const smallWidgets: Widget[] = []
    const regularWidgets: Widget[] = []

    list.forEach(item => {
        if (item.config.col === 1) {
            smallWidgets.push(item)
        } else {
            regularWidgets.push(item)
        }
    })

    const smallWidgetsLen = smallWidgets.length

    return useObserver(() => (
        // @ts-ignore
        <Loader loading={loading}>
            <NoContent
                show={list.length === 0}
                icon="no-metrics-chart"
                title={<span className="text-2xl capitalize-first text-figmaColors-text-primary">Build your dashboard</span>}
                subtext={
                    <div className="w-4/5 m-auto mt-4"><AddMetricContainer siteId={siteId} /></div>
                }
            >
                {smallWidgets.length > 0 ? (
                    <>
                        <div className="font-semibold text-xl py-4 flex items-center gap-2">
                            <Icon name="grid-horizontal" size={26} />
                            Web Vitals
                        </div>
                        <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
                            {smallWidgets && smallWidgets.map((item: any, index: any) => (
                                <React.Fragment key={item.widgetId}>
                                <WidgetWrapper
                                    index={index}
                                    widget={item}
                                    moveListItem={(dragIndex: any, hoverIndex: any) => dashboard.swapWidgetPosition(dragIndex, hoverIndex)}
                                    dashboardId={dashboardId}
                                    siteId={siteId}
                                    isWidget={true}
                                    grid="vitals"
                                />
                                </React.Fragment>
                            ))}
                        </div>
                    </>
                ) : null}

                {smallWidgets.length > 0 && regularWidgets.length > 0 ? (
                    <div className="font-semibold text-xl py-4 flex items-center gap-2">
                        <Icon name="grid-horizontal" size={26} />
                        All Metrics
                    </div>
                ) : null}
                <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
                    {regularWidgets && regularWidgets.map((item: any, index: any) => (
                        <React.Fragment key={item.widgetId}>
                            <WidgetWrapper
                                index={smallWidgetsLen + index}
                                widget={item}
                                moveListItem={(dragIndex: any, hoverIndex: any) => dashboard.swapWidgetPosition(dragIndex, hoverIndex)}
                                dashboardId={dashboardId}
                                siteId={siteId}
                                isWidget={true}
                                grid="other"
                            />
                        </React.Fragment>
                    ))}
                    <div className="col-span-2"><AddMetricContainer siteId={siteId} /></div>
                </div>
            </NoContent>
        </Loader>
    ));
}

export default DashboardWidgetGrid;
