import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from 'UI';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';
import { dashboardMetricCreate, withSiteId } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';

interface IProps extends RouteComponentProps {
    metrics: any[];
    siteId: string;
    title: string;
    description: string;
}

function AddMetric({ metrics, history, siteId, title, description }: IProps) {
    const { dashboardStore } = useStore();
    const { hideModal } = useModal();

    const dashboard = dashboardStore.selectedDashboard;
    const selectedWidgetIds = dashboardStore.selectedWidgets.map((widget: any) => widget.metricId);
    const queryParams = new URLSearchParams(location.search);

    const onSave = () => {
        if (selectedWidgetIds.length === 0) return;
        dashboardStore
            .save(dashboard)
            .then(async (syncedDashboard) => {
                if (dashboard.exists()) {
                    await dashboardStore.fetch(dashboard.dashboardId);
                }
                dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
            })
            .then(hideModal);
    };

    const onCreateNew = () => {
        const path = withSiteId(dashboardMetricCreate(dashboard.dashboardId), siteId);
        if (!queryParams.has('modal')) history.push('?modal=addMetric');
        history.push(path);
        hideModal();
    };

    return (
        <div style={{ maxWidth: '85vw', width: 1200 }}>
            <div className="border-l shadow h-screen" style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%' }}>
                <div className="mb-6 pt-8 px-8 flex items-start justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-2xl">{title}</h1>
                        <div className="text-disabled-text">{description}</div>
                    </div>
                    {title.includes('Custom') ? (
                        <div>
                            <span className="text-md link" onClick={onCreateNew}>
                                + Create new
                            </span>
                        </div>
                    ) : (
                        <div>
                            Don’t find the one you need?
                            <span className="text-md link ml-2" onClick={onCreateNew}>
                                + Create custom metric
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid h-full grid-cols-4 gap-4 px-8 items-start py-1" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', gridTemplateRows: 'max-content' }}>
                    {metrics ? metrics.map((metric: any) => (
                        <WidgetWrapper
                            key={metric.metricId}
                            widget={metric}
                            active={selectedWidgetIds.includes(metric.metricId)}
                            isTemplate={true}
                            isWidget={metric.metricType === 'predefined'}
                            onClick={() => dashboardStore.toggleWidgetSelection(metric)}
                        />
                    )) : (
                        <div>No custom metrics created.</div>
                    )}
                </div>

                <div className="py-4 border-t px-8 bg-white w-full flex items-center justify-between">
                    <div>
                        {'Selected '}
                        <span className="font-semibold">{selectedWidgetIds.length}</span>
                        {' out of '}
                        <span className="font-semibold">{metrics.length}</span>
                    </div>
                    <Button variant="primary" disabled={selectedWidgetIds.length === 0} onClick={onSave}>
                        Add Selected
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default withRouter(observer(AddMetric));
