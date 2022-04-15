import React from 'react';
import { useObserver } from 'mobx-react-lite';
import DashboardMetricSelection from '../DashboardMetricSelection';
import DashboardForm from '../DashboardForm';
import { Button } from 'UI';
import { withRouter } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';
import { dashboardMetricCreate, withSiteId } from 'App/routes';

interface Props {
    history: any
    siteId?: string
    dashboardId?: string
}
function DashboardModal(props) {
    const { history, siteId, dashboardId } = props;
    const { dashboardStore } = useStore();
    const selectedWidgetsCount = useObserver(() => dashboardStore.selectedWidgets.length);
    const { hideModal } = useModal();
    const dashboard = useObserver(() => dashboardStore.dashboardInstance);
    const loading = useObserver(() => dashboardStore.isSaving);

    const onSave = () => {
        dashboardStore.save(dashboard).then(hideModal).then(() => {
            dashboardStore.fetch(dashboard.dashboardId)
        })
    }

    const handleCreateNew = () => {
        const path = withSiteId(dashboardMetricCreate(dashboardId), siteId);
        history.push(path);
        hideModal();
    }

    return useObserver(() => (
        <div
            className="fixed border-r shadow p-4 h-screen"
            style={{ backgroundColor: '#FAFAFA', zIndex: '999', width: '85%', maxWidth: '1300px' }}
        >
            <div className="mb-6 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl">
                        { dashboard.exists() ? "Add metric(s) to dashboard" : "Create Dashboard" }
                    </h1>
                </div>
                <div>
                    {dashboard.exists() && <Button outline size="small" onClick={handleCreateNew}>Create New</Button>}
                </div>
            </div>
            { !dashboard.exists() && (
                <>
                    <DashboardForm />
                    <p>Create new dashboard by choosing from the range of predefined metrics that you care about. You can always add your custom metrics later.</p>
                </>
            )}
            <DashboardMetricSelection />

            <div className="flex items-center absolute bottom-0 left-0 right-0 bg-white border-t p-3">
                <Button
                    primary
                    className=""
                    disabled={!dashboard.isValid || loading}
                    onClick={onSave}
                >
                    { dashboard.exists() ? "Add Selected to Dashboard" : "Create" }
                </Button>
                <span className="ml-2 color-gray-medium">{selectedWidgetsCount} Widgets</span>
            </div>
        </div>
    ));
}

export default withRouter(DashboardModal);