import React, { useEffect } from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { observer, useObserver } from "mobx-react-lite";
import { useStore } from 'App/mstore';
import { withRouter } from 'react-router-dom';
import {
    dashboardSelected,
    withSiteId,
} from 'App/routes';
import DashboardSideMenu from './components/DashboardSideMenu';
import { Loader } from 'UI';
import DashboardRouter from './components/DashboardRouter';

function NewDashboard(props) {
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);

    useEffect(() => {
        dashboardStore.fetchList().then((resp) => {
            if (parseInt(dashboardId) > 0) {
                dashboardStore.selectDashboardById(dashboardId);
            } 
            // else {
            //     dashboardStore.selectDefaultDashboard().then(({ dashboardId }) => {
            //         console.log('dashboardId', dashboardId)
            //         // if (!history.location.pathname.includes('/metrics')) {
            //         //     history.push(withSiteId(dashboardSelected(dashboardId), siteId));
            //         // }
            //     });
            // }
        });
    }, [siteId]);
    
    return (
        <Loader loading={loading}>
             <div className="page-margin container-90">
                <div className="side-menu">
                    <DashboardSideMenu siteId={siteId} />
                </div>
                <div className="side-menu-margined">
                    <DashboardRouter siteId={siteId} />
                </div>
            </div>
        </Loader>
    );
}

export default withPageTitle('New Dashboard')(
    withRouter(observer(NewDashboard))
);