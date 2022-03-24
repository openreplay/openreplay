import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from "mobx-react-lite";
import { useDashboardStore } from './store/store';
import { withRouter } from 'react-router-dom';
import DashboardView from './components/DashboardView';
import {
    dashboardSelected,
    dashboardMetricDetails,
    dashboardMetricCreate,
    withSiteId,
    dashboardMetrics,
} from 'App/routes';
import DashboardSideMenu from './components/DashboardSideMenu';
import WidgetView from './components/WidgetView';
import MetricsView from './components/MetricsView';

function NewDashboard(props) {
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    const store: any = useDashboardStore();
    const dashboard = store.selectedDashboard;

    useEffect(() => {
        store.setSiteId(siteId);
    }, []);

    useEffect(() => {
        if (!dashboard || !dashboard.dashboardId) {
            if (dashboardId) {
                store.selectDashboardById(dashboardId);
            } else {
                store.selectDefaultDashboard().then((resp) => {
                    history.push(withSiteId(dashboardSelected(resp.dashboardId), siteId));
                });
            }
        } 

        // if (dashboard) {
        //     if (dashboard.dashboardId !== dashboardId) {
        //         history.push(withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(siteId)));
        //     }

        //     history.replace(withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(siteId)));
        // }
        
        // console.log('dashboard', dashboard)
    }, [dashboard]);

    console.log('rendering dashboard', props.match.params);

    return (
        <>
            {/* { dashboard && dashboard.dashboardId && ( */}
                <Switch>
                    <Route exact strict path={withSiteId(dashboardMetrics(), siteId)}>
                        <div className="page-margin container-90">
                            <div className="side-menu">
                                <DashboardSideMenu />
                            </div>
                            <div className="side-menu-margined">
                                <MetricsView />
                            </div>
                        </div>
                    </Route>
                    { dashboardId && (
                        <>
                            <Route exact strict path={withSiteId(dashboardSelected(dashboardId), siteId)}>
                                <div className="page-margin container-90">
                                    <div className="side-menu">
                                        <DashboardSideMenu />
                                    </div>
                                    <div className="side-menu-margined">
                                        <DashboardView dashboard={dashboard} />
                                    </div>
                                </div>
                            </Route>
                            
                            {/* <Route exact strict path={withSiteId(dashboardMetricCreate(dashboard.dashboardId), siteId)}>
                                <WidgetView />
                            </Route>
                            <Route exact strict path={withSiteId(dashboardMetricDetails(dashboard.dashboardId, metricId), siteId)}>
                                <WidgetView />
                            </Route> */}
                            {/* <Redirect exact strict to={withSiteId(dashboardSelected(dashboardId), siteId )} /> */}
                        </>
                    )}
                </Switch>
            {/* )} */}
        </>
    );
}

export default withPageTitle('New Dashboard')(
    withRouter(observer(NewDashboard))
);