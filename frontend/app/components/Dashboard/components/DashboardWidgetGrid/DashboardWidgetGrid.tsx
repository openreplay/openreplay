import React from 'react';
import { useDashboardStore } from '../../store/store';
import WidgetWrapper from '../../WidgetWrapper';
import { NoContent, Button, Loader } from 'UI';
import { useObserver } from 'mobx-react-lite';
// import { divider } from '../../Filters/filters.css';

function DashboardWidgetGrid(props) {
    const store: any = useDashboardStore();
    const loading = store.isLoading;
    const dashbaord = store.selectedDashboard;
    const list = dashbaord.widgets;
    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent
                show={list.length === 0}
                icon="exclamation-circle"
                title="No metrics added to this dashboard"
                subtext={
                    <div>
                        <p>Metrics helps you visualize trends from sessions captured by OpenReplay</p>
                        <Button size="small" primary>Add Metric</Button>
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
                        />
                    ))}
                </div>
            </NoContent>
        </Loader>
    ));
}

export default DashboardWidgetGrid;