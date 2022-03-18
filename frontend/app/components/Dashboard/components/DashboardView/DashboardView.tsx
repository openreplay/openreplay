import React from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { observer } from 'mobx-react-lite';
import { withDashboardStore } from '../../store/store';

function DashboardView(props) {
    const { store } = props;
    const dashboard = store.selectedDashboard
    const list = dashboard?.widgets;
    return dashboard ? (
        <div>
            test {dashboard.dashboardId}
            <div className="grid grid-cols-2 gap-4">
                {list && list.map(item => <WidgetWrapper widget={item} key={item.widgetId} />)}
            </div>
        </div>
    ) : <h1>Loading...</h1>;
}

export default withDashboardStore(observer(DashboardView));