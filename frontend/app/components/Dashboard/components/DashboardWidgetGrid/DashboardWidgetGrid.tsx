import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Loader } from 'UI';
import { useObserver } from 'mobx-react-lite';
import AddMetricContainer from './AddMetricContainer'

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
    const dashboard: any = dashboardStore.selectedDashboard;
    const list: any = useObserver(() => dashboard?.widgets);

    return useObserver(() => (
        // @ts-ignore
        <Loader loading={loading}>
            <NoContent
                show={list.length === 0}
                icon="no-metrics-chart"
                title={<span className="text-2xl capitalize-first text-figmaColors-text-primary">Build your dashboard</span>}
                subtext={
                    <div className="w-4/5 m-auto"><AddMetricContainer siteId={siteId} /></div>
                }
            >
                <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
                    {list && list.map((item: any, index: any) => (
                        <WidgetWrapper
                            index={index}
                            widget={item}
                            key={item.widgetId}
                            moveListItem={(dragIndex: any, hoverIndex: any) => dashboard.swapWidgetPosition(dragIndex, hoverIndex)}
                            dashboardId={dashboardId}
                            siteId={siteId}
                            isWidget={true}
                        />
                    ))}
                    <div className="col-span-2"><AddMetricContainer siteId={siteId} /></div>
                </div>
            </NoContent>
        </Loader>
    ));
}

export default DashboardWidgetGrid;
