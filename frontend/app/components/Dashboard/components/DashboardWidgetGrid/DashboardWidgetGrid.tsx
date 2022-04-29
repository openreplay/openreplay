import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Button, Loader } from 'UI';
import { useObserver } from 'mobx-react-lite';

interface Props {
    siteId: string,
    dashboardId: string;
    onEditHandler: () => void;
    id?: string;
}
function DashboardWidgetGrid(props) {
    const { dashboardId, siteId } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const dashboard: any = dashboardStore.selectedDashboard;
    const list: any = useObserver(() => dashboard?.widgets);

    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent
                show={list.length === 0}
                icon="no-metrics-chart"
                title="No metrics added to this dashboard"
                subtext={
                    <div>
                        <p>Metrics helps you visualize trends from sessions captured by OpenReplay</p>
                        <Button size="small" primary onClick={props.onEditHandler}>Add Metric</Button>
                    </div>
                }
            >
                <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
                    {list && list.map((item, index) => (
                        <WidgetWrapper
                            index={index}
                            widget={item}
                            key={item.widgetId}
                            moveListItem={(dragIndex, hoverIndex) => dashboard.swapWidgetPosition(dragIndex, hoverIndex)}
                            dashboardId={dashboardId}
                            siteId={siteId}
                            isWidget={true}
                        />
                    ))}
                </div>
            </NoContent>
        </Loader>
    ));
}

export default DashboardWidgetGrid;