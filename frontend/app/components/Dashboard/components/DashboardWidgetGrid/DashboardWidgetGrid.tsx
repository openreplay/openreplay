import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Button, Loader } from 'UI';
import { useObserver } from 'mobx-react-lite';

interface Props {
    dashboardId: string;
    onEditHandler: () => void;
}
function DashboardWidgetGrid(props) {
    const { dashboardId } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const dashbaord: any = dashboardStore.selectedDashboard;
    const list: any = useObserver(() => dashbaord?.widgets);

    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent
                show={list.length === 0}
                icon="exclamation-circle"
                title="No metrics added to this dashboard"
                subtext={
                    <div>
                        <p>Metrics helps you visualize trends from sessions captured by OpenReplay</p>
                        <Button size="small" primary onClick={props.onEditHandler}>Add Metric</Button>
                    </div>
                }
            >
                <div className="grid grid-cols-2 gap-4">
                    {list && list.map((item, index) => (
                        <WidgetWrapper
                            index={index}
                            widget={item}
                            key={item.widgetId}
                            moveListItem={(dragIndex, hoverIndex) => dashbaord.swapWidgetPosition(dragIndex, hoverIndex)}
                            dashboardId={dashboardId}
                        />
                    ))}
                </div>
            </NoContent>
        </Loader>
    ));
}

export default DashboardWidgetGrid;