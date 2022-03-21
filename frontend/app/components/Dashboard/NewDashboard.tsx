import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from "mobx-react-lite";
import { useDashboardStore } from './store/store';
import { withRouter } from 'react-router-dom';
import DashboardView from './components/DashboardView';
import { dashboardSelected, dashboardMetricDetails, dashboardMetricCreate, withSiteId } from 'App/routes';
import DashboardSideMenu from './components/DashboardSideMenu';
import WidgetView from './WidgetView';

function NewDashboard(props) {
    const { match: { params: { siteId, dashboardId, metricId } } } = props;
    const store: any = useDashboardStore();
    const dashboard = store.selectedDashboard;

    useEffect(() => {
        store.setSiteId(siteId);
    }, []);

    useEffect(() => {
        console.log('dashboardId', dashboardId);
        if (!dashboard || !dashboard.dashboardId) {
            if (dashboardId) {
                store.selectDashboardById(dashboardId);
            } else {
                store.selectDefaultDashboard();
            }
        }
        
    }, [dashboard]);

    return (
        <div className="page-margin container-90">
            <div className="side-menu">
                <DashboardSideMenu />
            </div>
            <div className="side-menu-margined">
                { dashboard && dashboard.dashboardId && (
                    <Switch>
                        <Route exact strict path={withSiteId(dashboardSelected(dashboard.dashboardId), siteId)}>
                            <DashboardView dashboard={dashboard} />
                        </Route>
                        <Route exact strict path={withSiteId(dashboardMetricCreate(dashboard.dashboardId), siteId)}>
                            <WidgetView />
                        </Route>
                        <Route exact strict path={withSiteId(dashboardMetricDetails(dashboard.dashboardId, metricId), siteId)}>
                            <WidgetView />
                        </Route>
                        {/* <Route exact strict path={withSiteId((dashboard.dashboardId), siteId)}>
                            <WidgetView />
                        </Route> */}
                        <Redirect exact strict to={withSiteId(dashboardSelected(dashboard.dashboardId), siteId )} />
                    </Switch>
                )}
            </div>
        </div>
    );
}

export default withPageTitle('New Dashboard')(
    withRouter(observer(NewDashboard))
);