import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from 'App/mstore';
import { withSiteId, dashboardSelected } from 'App/routes';
import { useHistory, useLocation, useParams } from 'App/routing';
import { Loader } from 'UI';

import Alerts from '../Alerts';
import CreateAlert from '../Alerts/NewAlert';
import DashboardsView from '../DashboardList';
import DashboardView from '../DashboardView';
import MetricsView from '../MetricsView';
import WidgetSubDetailsView from '../WidgetSubDetailsView';
import WidgetView from '../WidgetView';

/**
 * Landing on /dashboard used to show a list of dashboards, making the dashboard itself
 * two clicks away. Instead we send the user straight to a dashboard — pinned first,
 * otherwise the most recent — and only fall back to the list when none exist yet.
 */
const DashboardLanding = observer(({ siteId }: { siteId: string }) => {
  const { dashboardStore } = useStore();
  const history = useHistory();
  const { dashboards } = dashboardStore;
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (dashboards.length) {
      setChecked(true);
      return;
    }
    void dashboardStore.fetchList().finally(() => setChecked(true));
  }, []);

  const target = React.useMemo(() => {
    if (!dashboards.length) return null;
    const pinned = dashboards.find((d: any) => d.isPinned);
    return pinned ?? dashboards[0];
  }, [dashboards]);

  React.useEffect(() => {
    if (!target) return;
    history.replace(
      withSiteId(dashboardSelected(target.dashboardId), siteId),
    );
  }, [target?.dashboardId]);

  if (!checked || target) return <Loader loading className="flex-1" />;
  return <DashboardsView siteId={siteId} history={history} />;
});

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
    return <DashboardLanding siteId={siteId} />;
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
