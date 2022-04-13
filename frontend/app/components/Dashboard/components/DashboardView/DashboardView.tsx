import React, { useEffect } from 'react';
import { observer, useObserver } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Button, PageTitle, Link, Loader, NoContent, ItemMenu } from 'UI';
import { withSiteId, dashboardMetricCreate, dashboardSelected, dashboard } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import { confirm } from 'UI/Confirmation';
import { withRouter } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import DashboardModal from '../DashboardModal';
import DashboardEditModal from '../DashboardEditModal';
import DateRange from 'Shared/DateRange';

interface Props {
    siteId: number;
    history: any
    match: any
    dashboardId: any
}
function DashboardView(props: Props) {
    const { siteId, dashboardId } = props;
    const { dashboardStore } = useStore();
    const { hideModal, showModal } = useModal();
    const loading = useObserver(() => dashboardStore.fetchingDashboard);
    const dashboards = useObserver(() => dashboardStore.dashboards);
    const dashboard: any = useObserver(() => dashboardStore.selectedDashboard);
    const period = useObserver(() => dashboardStore.period);
    const [showEditModal, setShowEditModal] = React.useState(false);

    useEffect(() => {
        if (!dashboard || !dashboard.dashboardId) return;
        dashboardStore.fetch(dashboard.dashboardId)
    }, [dashboard]);

    useEffect(() => {
        if (dashboardId) return;
        dashboardStore.selectDefaultDashboard();
    }, []);
    
    const onAddWidgets = () => {
        dashboardStore.initDashboard(dashboard)
        showModal(<DashboardModal siteId={siteId} dashboardId={dashboardId} />, {})
    }

    const onEdit = () => {
        dashboardStore.initDashboard(dashboard)
        setShowEditModal(true)
    }

    const onDelete = async () => {
        if (await confirm({
          header: 'Confirm',
          confirmButton: 'Yes, delete',
          confirmation: `Are you sure you want to permanently delete this Dashboard?`
        })) {
            dashboardStore.deleteDashboard(dashboard).then(() => {
                dashboardStore.selectDefaultDashboard().then(({ dashboardId }) => {
                    props.history.push(withSiteId(dashboard(), siteId));
                });
            });
        }
    }
    
    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent
                show={dashboards.length === 0 || !dashboard || !dashboard.dashboardId}
                icon="no-metrics-chart"
                title="No dashboards available."
                size="small"
                iconSize={180}
                subtext={
                    <Button primary size="small" onClick={onAddWidgets}>Create Dashboard</Button>
                }
            >
                <div>
                    <DashboardEditModal
                        show={showEditModal}
                        closeHandler={() => setShowEditModal(false)}
                    />
                    <div className="flex items-center mb-4 justify-between">
                        <div className="flex items-center">
                            <PageTitle title={dashboard?.name} className="mr-3" />
                            <Button primary size="small" onClick={onAddWidgets}>Add Metric</Button>
                        </div>
                        <div className="flex items-center">
                            <div className="flex items-center">
                                {/* <span className="mr-2 color-gray-medium">Time Range</span> */}
                                <DateRange
                                    rangeValue={period.rangeName}
                                    startDate={period.start}
                                    endDate={period.end}
                                    onDateChange={(period) => dashboardStore.setPeriod(period)}
                                    customRangeRight
                                    direction="left"
                                />
                            </div>
                            <div className="mx-4" />
                            <div className="flex items-center">
                                <span className="mr-1 color-gray-medium">More</span>
                                <ItemMenu
                                    items={[
                                        {
                                            text: 'Edit',
                                            onClick: onEdit
                                        },
                                        {
                                            text: 'Delete Dashboard',
                                            onClick: onDelete
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                    <DashboardWidgetGrid
                        siteId={siteId}
                        dashboardId={dashboardId}
                        onEditHandler={onAddWidgets}
                    />
                </div>
            </NoContent>
        </Loader>
    ));
}

export default withRouter(withModal(DashboardView));