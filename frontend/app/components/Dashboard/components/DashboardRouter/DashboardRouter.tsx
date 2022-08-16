import React from 'react';
import { Switch, Route } from 'react-router';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
    metrics,
    metricDetails,
    metricDetailsSub,
    dashboardSelected,
    dashboardMetricCreate,
    dashboardMetricDetails,
    withSiteId,
    dashboard,
} from 'App/routes';
import DashboardView from '../DashboardView';
import MetricsView from '../MetricsView';
import WidgetView from '../WidgetView';
import WidgetSubDetailsView from '../WidgetSubDetailsView';
import DashboardsView from '../DashboardList';

function DashboardViewSelected({ siteId, dashboardId }: { siteId: string, dashboardId: string }) {
    return (
        <DashboardView siteId={siteId} dashboardId={dashboardId} />
    )
}

interface Props extends RouteComponentProps {
    match: any
}
function DashboardRouter(props: Props) {
    const { match: { params: { siteId, dashboardId } }, history } = props;

    return (
        <div>
            <Switch>
                <Route exact strict path={withSiteId(metrics(), siteId)}>
                    <MetricsView siteId={siteId} />
                </Route>

                <Route exact strict path={withSiteId(metricDetails(), siteId)}>
                    <WidgetView siteId={siteId} {...props} />
                </Route>
                
                <Route exact strict path={withSiteId(metricDetailsSub(), siteId)}>
                    <WidgetSubDetailsView siteId={siteId} {...props} />
                </Route>

                <Route exact path={withSiteId(dashboard(), siteId)}>
                    <DashboardsView siteId={siteId} history={history} /> 
                </Route>

                <Route exact strict path={withSiteId(dashboardMetricDetails(dashboardId), siteId)}>
                    <WidgetView siteId={siteId} {...props} />
                </Route>

                <Route exact strict path={withSiteId(dashboardMetricCreate(dashboardId), siteId)}>
                    <WidgetView siteId={siteId} {...props} />
                </Route>

                <Route exact strict path={withSiteId(dashboardSelected(dashboardId), siteId)}>
                    <DashboardViewSelected siteId={siteId} dashboardId={dashboardId} />
                </Route>
            </Switch>
        </div>
    );
}

export default withRouter(DashboardRouter);
