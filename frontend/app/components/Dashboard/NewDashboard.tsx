import React, { useEffect } from 'react';
import { useObserver } from "mobx-react-lite";
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import DashboardSideMenu from './components/DashboardSideMenu';
import { Loader } from 'UI';
import DashboardRouter from './components/DashboardRouter';
import cn from 'classnames';
import withPermissions from 'HOCs/withPermissions'

interface RouterProps {
    siteId: string;
    dashboardId: string;
    metricId: string;
}

function NewDashboard(props: RouteComponentProps<RouterProps>) {
    const { history, match: { params: { siteId, dashboardId } } } = props;
    const { dashboardStore } = useStore();
    const loading = useObserver(() => dashboardStore.isLoading);
    const isMetricDetails = history.location.pathname.includes('/metrics/') || history.location.pathname.includes('/metric/');
    const isDashboardDetails = history.location.pathname.includes('/dashboard/')
    const isAlertsDetails = history.location.pathname.includes('/alert/')

    const shouldHideMenu = isMetricDetails || isDashboardDetails || isAlertsDetails;
    useEffect(() => {
        dashboardStore.fetchList().then((resp) => {
            if (parseInt(dashboardId) > 0) {
                dashboardStore.selectDashboardById(dashboardId);
            }
        });
    }, [siteId]);

    return useObserver(() => (
        <Loader loading={loading} className="mt-12">
             <div className="page-margin container-90">
                <div className={cn("side-menu", { 'hidden' : shouldHideMenu })}>
                    <DashboardSideMenu siteId={siteId} />
                </div>
                <div
                    className={cn({
                        "side-menu-margined" : !shouldHideMenu,
                        "container-70" : shouldHideMenu
                    })}
                >
                    <DashboardRouter />
                </div>
            </div>
        </Loader>
    ));
}

export default withRouter(withPermissions(['METRICS'])(NewDashboard));
