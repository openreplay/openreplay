import React, { useEffect } from 'react';
import { observer, useObserver } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Button, PageTitle, Link, Loader, NoContent } from 'UI';
import { withSiteId, dashboardMetricCreate, dashboardSelected, dashboard } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import { confirm } from 'UI/Confirmation';
import { withRouter } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import DashboardModal from '../DashboardModal';

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
    const dashboard: any = dashboardStore.selectedDashboard

    useEffect(() => {
        dashboardStore.fetch(dashboardId)
    }, []);
    
    const onEditHandler = () => {
        dashboardStore.initDashboard(dashboard)
        showModal(<DashboardModal />, {})
    }

    const onDelete = async () => {
        if (await confirm({
          header: 'Confirm',
          confirmButton: 'Yes, Delete',
          confirmation: `Are you sure you want to permanently delete this Dashboard?`
        })) {
            dashboardStore.deleteDashboard(dashboard).then(() => {
                dashboardStore.selectDefaultDashboard().then(({ dashboardId }) => {
                    props.history.push(withSiteId(dashboard(), siteId));
                });
            });
        }
    }
    
    return (
        <Loader loading={loading}>
            <NoContent
                show={!dashboard || !dashboard.dashboardId}
                title="No data available."
                size="small"
            >
                <div>
                    <div className="flex items-center mb-4 justify-between">
                        <div className="flex items-center">
                            <PageTitle title={dashboard?.name} className="mr-3" />
                            {/* <Link to={withSiteId(dashboardMetricCreate(dashboard?.dashboardId), siteId)}><Button primary size="small">Add Metric</Button></Link> */}
                            <Button primary size="small" onClick={onEditHandler}>Add Metric</Button>
                        </div>
                        <div>
                            <Button onClick={onDelete}>Remove</Button>
                        </div>
                    </div>
                    <DashboardWidgetGrid />
                </div>
            </NoContent>
        </Loader>
    )
}

export default withRouter(withModal(observer(DashboardView)));