import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Loader } from 'UI';
import { withSiteId, dashboard, metrics } from 'App/routes';
import withPermissions from 'HOCs/withPermissions';
import DashboardRouter from './components/DashboardRouter';

interface RouterProps {
  siteId: string;
  dashboardId: string;
  metricId: string;
}

function NewDashboard(props: RouteComponentProps<RouterProps>) {
  const {
    history,
    match: {
      params: { siteId, dashboardId },
    },
  } = props;
  const { dashboardStore } = useStore();
  const initId = React.useRef(siteId);
  const loading = dashboardStore.isLoading;
  const isDbMetric = /\/dashboard\/\d+\/metric\/\d+/.test(
    history.location.pathname,
  );
  const isMetricListMetric = /\/metrics\/\d+/.test(history.location.pathname);
  useEffect(() => {
    if (siteId !== initId.current) {
      if (isMetricListMetric) {
        history.push(withSiteId(metrics(), siteId));
      }
      if (isDbMetric) {
        history.push(withSiteId(dashboard(), siteId));
      }
    }
    dashboardStore.fetchList().then((resp) => {
      if (parseInt(dashboardId) > 0) {
        dashboardStore.selectDashboardById(dashboardId);
      }
    });
  }, [siteId]);

  return (
    <Loader loading={loading} className="mt-12">
      <DashboardRouter />
    </Loader>
  );
}

export default withRouter(withPermissions(['METRICS'])(observer(NewDashboard)));
