import React from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { useDashboardStore } from '../../store/store';
import { observer, useObserver } from 'mobx-react-lite';
import cn from 'classnames';
import { Button } from 'UI';
import DashboardMetricSelection from '../DashboardMetricSelection';



function DashboardModal(props) {
    const store: any = useDashboardStore();
   

    return useObserver(() => (
        <div className="fixed border-r shadow p-4 h-screen" style={{ backgroundColor: '#FAFAFA', zIndex: '9999', width: '80%'}}>
            <div className="mb-6">
                <h1 className="text-2xl">Add Metric to Dashboard</h1>
            </div>
            <DashboardMetricSelection />
        </div>
    ));
}

export default observer(DashboardModal);