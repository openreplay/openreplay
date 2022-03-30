import React from 'react';
import { useObserver } from 'mobx-react-lite';
import DashboardMetricSelection from '../DashboardMetricSelection';
import DashboardForm from '../DashboardForm';
import { Button } from 'UI';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';


function DashboardModal(props) {
    const { dashboardStore } = useStore();
    const { hideModal } = useModal();
    const dashbaord = useObserver(() => dashboardStore.dashboardInstance);
    const loading = useObserver(() => dashboardStore.isSaving);

    const onSave = () => {
        dashboardStore.save(dashbaord).then(hideModal)
    }

    return useObserver(() => (
        <div
            className="fixed border-r shadow p-4 h-screen"
            style={{ backgroundColor: '#FAFAFA', zIndex: '9999', width: '80%'}}
        >
            <div className="mb-6">
                <h1 className="text-2xl">Create Dashboard</h1>
            </div>
            <DashboardForm />
            <p>Create new dashboard by choosing from the range of predefined metrics that you care about. You can always add your custom metrics later.</p>
            <DashboardMetricSelection />

            <div className="flex absolute bottom-0 left-0 right-0 bg-white border-t p-3">
                <Button
                    primary
                    className=""
                    disabled={!dashbaord.isValid || loading}
                    onClick={onSave}
                >
                    Add Selected to Dashboard
                </Button>
            </div>
        </div>
    ));
}

export default DashboardModal;