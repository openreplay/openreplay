import React from 'react';
import { Routes, Route } from 'react-router';

import {
  metrics,
  metricDetails,
  metricDetailsSub,
  dashboardSelected,
  dashboardMetricCreate,
  dashboardMetricDetails,
  withSiteId,
  dashboard,
  alerts,
  alertCreate,
  alertEdit,
} from 'App/routes';
import DashboardView from '../DashboardView';
import MetricsView from '../MetricsView';
import WidgetView from '../WidgetView';
import WidgetSubDetailsView from '../WidgetSubDetailsView';
import DashboardsView from '../DashboardList';
import Alerts from '../Alerts';
import CreateAlert from '../Alerts/NewAlert'
import { useParams, useNavigate } from "react-router";

function DashboardViewSelected({ siteId, dashboardId }: { siteId: string; dashboardId: string }) {
  return <DashboardView siteId={siteId} dashboardId={dashboardId} />;
}

function DashboardRouter(props: any) {
  const { siteId, dashboardId } = useParams();

  return (
    <div>
      <Routes>
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
          <DashboardsView siteId={siteId} />
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

        <Route exact strict path={withSiteId(alerts(), siteId)}>
          <Alerts siteId={siteId} />
        </Route>

        <Route exact path={withSiteId(alertCreate(), siteId)}>
          {/* @ts-ignore */}
          <CreateAlert siteId={siteId as string} />
        </Route>

        <Route exact path={withSiteId(alertEdit(), siteId)}>
          {/* @ts-ignore */}
          <CreateAlert siteId={siteId} {...props} />
        </Route>
      </Routes>
    </div>
  );
}

export default DashboardRouter;
