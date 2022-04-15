import React, { useEffect } from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { observer, useObserver } from "mobx-react-lite";
import { useStore } from 'App/mstore';
import { withRouter } from 'react-router-dom';
import DashboardSideMenu from './components/DashboardSideMenu';
import { Loader } from 'UI';
import DashboardRouter from './components/DashboardRouter';
import cn from 'classnames';

function NewDashboard(props) {
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const isMetricDetails = history.location.pathname.includes('/metrics/') || history.location.pathname.includes('/metric/');

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
    
    return useObserver(() => (
        <Loader loading={loading}>
             <div className="page-margin container-90">
                <div className={cn("side-menu", { 'hidden' : isMetricDetails })}>
                    <DashboardSideMenu siteId={siteId} />
                </div>
                <div className={cn({ "side-menu-margined" : !isMetricDetails, "container-70" : isMetricDetails })}>
                    <DashboardRouter siteId={siteId} />
                </div>
            </div>
        </Loader>
    ));
}

export default withPageTitle('New Dashboard')(withRouter(NewDashboard));