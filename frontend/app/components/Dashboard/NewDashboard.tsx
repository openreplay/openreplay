import React, { useEffect } from 'react';
import { useObserver } from "mobx-react-lite";
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import DashboardSideMenu from './components/DashboardSideMenu';
import { Loader } from 'UI';
import DashboardRouter from './components/DashboardRouter';
import cn from 'classnames';
import { withSiteId } from 'App/routes';

function NewDashboard(props: RouteComponentProps<{}>) {
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const isMetricDetails = history.location.pathname.includes('/metrics/') || history.location.pathname.includes('/metric/');

    useEffect(() => {
        dashboardStore.fetchList().then((resp) => {
            if (parseInt(dashboardId) > 0) {
                dashboardStore.selectDashboardById(dashboardId);
            }
        });
        if (!dashboardId && location.pathname.includes('dashboard')) {
            dashboardStore.selectDefaultDashboard().then(({ dashboardId }) => {
                props.history.push(withSiteId(`/dashboard/${dashboardId}`, siteId));
            }, () => {
                props.history.push(withSiteId('/dashboard', siteId));
            })
        }

    }, [siteId]);

    return useObserver(() => (
        <Loader loading={loading}>
             <div className="page-margin container-90">
                <div className={cn("side-menu", { 'hidden' : isMetricDetails })}>
                    <DashboardSideMenu siteId={siteId} />
                </div>
                <div
                    className={cn({
                        "side-menu-margined" : !isMetricDetails,
                        "container-70" : isMetricDetails
                    })}
                >
                    <DashboardRouter siteId={siteId} />
                </div>
            </div>
        </Loader>
    ));
}

export default withRouter(NewDashboard);
