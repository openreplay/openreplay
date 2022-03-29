import React, { useEffect } from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { observer } from 'mobx-react-lite';
import { withDashboardStore } from '../../store/store';
import { Button, PageTitle, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import DashboardModal from '../DashboardModal'
import DashboardWidgetGrid from '../DashboardWidgetGrid';

function DashboardView(props) {
    // let { handleModal } = React.useContext(ModalContext);
    const { store } = props;
    const dashboard = store.selectedDashboard
    const list = dashboard?.widgets;
    useEffect(() => {
        // props.showModal(DashboardModal)
    }, [])
    return (
        <div>
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-center">
                    <PageTitle title={dashboard.name} className="mr-3" />
                    <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), store.siteId)}><Button primary size="small">Add Metric</Button></Link>
                </div>
                <div>
                    Right
                </div>
            </div>
            <DashboardWidgetGrid />
        </div>
    )
}

export default withDashboardStore(withModal(observer(DashboardView)));