import React from 'react';
import { Switch, Route } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    metrics,
    metricDetails,
    dashboardSelected,
    dashboardMetricCreate,
    withSiteId,
    dashboard,
} from 'App/routes';
import DashboardView from '../DashboardView';
import MetricsView from '../MetricsView';
import WidgetView from '../WidgetView';

interface Props {
    history: any
    match: any
}
function DashboardRouter(props: Props) {
    const { match: { params: { siteId, dashboardId, metricId } } } = props;
    return (
        <div>
            <Switch>
                <Route exact strict path={withSiteId(metrics(), siteId)}>
                    <MetricsView />
                </Route>

                <Route exact strict path={withSiteId(metricDetails(), siteId)}>
                    <WidgetView siteId={siteId} {...props} />
                </Route>

                <Route exact strict path={withSiteId(dashboardMetricCreate(dashboardId), siteId)}>
                    <WidgetView siteId={siteId} {...props} />
                </Route>

                <Route exact strict path={withSiteId(dashboard(''), siteId)}>
                    <>Nothing...</>
                </Route>

                <Route exact strict path={withSiteId(dashboardSelected(dashboardId), siteId)}>
                    <DashboardView siteId={siteId} dashboardId={dashboardId} />
                </Route>
            </Switch>
        </div>
    );
}

export default withRouter(DashboardRouter);