import React, { Suspense, lazy } from 'react';

import { useHistory, useLocation, useParams } from 'App/routing';
import { Loader } from 'UI';

import DashboardsView from '../DashboardList';
import DashboardView from '../DashboardView';

// the card builder and the alert views are never on screen with the dashboard
// grid, so they stay out of its chunk
const Alerts = lazy(() => import('../Alerts'));
const CreateAlert = lazy(() => import('../Alerts/NewAlert'));
const MetricsView = lazy(() => import('../MetricsView'));
const WidgetSubDetailsView = lazy(() => import('../WidgetSubDetailsView'));
const WidgetView = lazy(() => import('../WidgetView'));

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

  const renderView = () => {
    if (section === 'metrics') {
      if (subId)
        return <WidgetSubDetailsView siteId={siteId} {...routeProps} />;
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
  };

  return (
    <Suspense fallback={<Loader loading className="mt-12" />}>
      {renderView()}
    </Suspense>
  );
}

export default DashboardRouter;
