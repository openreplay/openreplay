import React from 'react';
import { useDashboardStore } from '../../store/store';
import { useObserver } from 'mobx-react-lite';
import DashboardMetricSelection from '../DashboardMetricSelection';
import DashboardForm from '../DashboardForm';
import { Button } from 'UI';


function DashboardModal(props) {
    const store: any = useDashboardStore();
    const dashbaord = useObserver(() => store.newDashboard);

    return useObserver(() => (
        <div className="fixed border-r shadow p-4 h-screen" style={{ backgroundColor: '#FAFAFA', zIndex: '9999', width: '80%'}}>
            <div className="mb-6">
                <h1 className="text-2xl">Create Dashboard</h1>
            </div>
            <DashboardForm />
            <p>Create new dashboard by choosing from the range of predefined metrics that you care about. You can always add your custom metrics later.</p>
            <DashboardMetricSelection />

            <div className="flex absolute bottom-0 left-0 right-0 bg-white border-t p-3">
                <Button primary className="" disabled={!dashbaord.isValid} onClick={() => store.save(dashbaord)}>
                    Add Selected to Dashboard
                </Button>
            </div>
        </div>
    ));
}

export default DashboardModal;