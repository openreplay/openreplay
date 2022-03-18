import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from "mobx-react-lite";
import { withDashboardStore } from './store/store';
import { withRouter } from 'react-router-dom';
import DashboardView from './components/DashboardView';
import { dashboardSelected, dashboardMetric, withSiteId } from 'App/routes';

function NewDashboard(props) {
    const { store, match: { params: { siteId, dashboardId, metricId } } } = props;
    const dashboard = store.selectedDashboard;

    useEffect(() => {
        store.setSiteId(siteId);
        if (dashboardId) {
            store.selectDashboardById(dashboardId);
        } else {
            store.selectDefaultDashboard();
        }
    }, [dashboardId]);

    return (
        <div className="page-margin container-90">
            <div className="side-menu">
                MENU
            </div>
            <div className="side-menu-margined">
                <Switch>
                    <Route exact path={withSiteId(dashboardSelected(dashboardId), siteId)}>
                        <DashboardView dashboard={dashboard} />
                    </Route>
                    <Route exact path={withSiteId(dashboardMetric(dashboardId, metricId), siteId)}>
                        <h1>Metric</h1>
                    </Route>
                    <Redirect to={withSiteId(dashboardSelected(dashboardId), siteId )} />
                </Switch>
            </div>
        </div>
    );
}

export default withPageTitle('New Dashboard')(
    withRouter(withDashboardStore(observer(NewDashboard)))
);