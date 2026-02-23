import React from 'react';

import { useHistory, useLocation, useParams } from 'App/routing';

import Alerts from '../Alerts';
import CreateAlert from '../Alerts/NewAlert';
import DashboardsView from '../DashboardList';
import DashboardView from '../DashboardView';
import MetricsView from '../MetricsView';
import WidgetSubDetailsView from '../WidgetSubDetailsView';
import WidgetView from '../WidgetView';

type RouterParams = {
  siteId?: string;
  dashboardId?: string;
  metricId?: string;
  subId?: string;
  alertId?: string;
};

function DashboardRouter() {
  const history = useHistory();
  const location = useLocation();
  const params = useParams<RouterParams>();

  const { siteId, dashboardId, metricId, subId } = params;

  const section = location.pathname.split('/')[2];

  const routeProps = {
    history,
    location,
    match: { params },
  };

  if (!siteId) return null;

  if (section === 'metrics') {
    if (subId) return <WidgetSubDetailsView siteId={siteId} {...routeProps} />;
    if (metricId) return <WidgetView siteId={siteId} {...routeProps} />;
    return <MetricsView siteId={siteId} />;
  }

  if (section === 'dashboard') {
    if (metricId) return <WidgetView siteId={siteId} {...routeProps} />;
    if (dashboardId)
      return <DashboardView siteId={siteId} dashboardId={dashboardId} />;
    return <DashboardsView siteId={siteId} history={history} />;
  }

  if (section === 'alerts') {
    return <Alerts siteId={siteId} />;
  }

  if (section === 'alert') {
    // @ts-ignore
    return <CreateAlert siteId={siteId} {...routeProps} />;
  }

  return null;
}

export default DashboardRouter;
