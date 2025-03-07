import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useNavigate, useParams } from "react-router";
import { Loader } from 'UI';
import { withSiteId, dashboard, metrics } from "App/routes";
import DashboardRouter from './components/DashboardRouter';
import withPermissions from 'HOCs/withPermissions';

function NewDashboard() {
  const { siteId, dashboardId } = useParams()
  const navigate = useNavigate();
  const { dashboardStore } = useStore();
  const initId = React.useRef(siteId)
  const loading = dashboardStore.isLoading;
  const isDbMetric = /\/dashboard\/\d+\/metric\/\d+/.test(history.location.pathname);
  const isMetricListMetric = /\/metrics\/\d+/.test(history.location.pathname);
  useEffect(() => {
    if (siteId !== initId.current) {
      if (isMetricListMetric) {
        navigate(withSiteId(metrics(), siteId))
      }
      if (isDbMetric) {
        navigate(withSiteId(dashboard(), siteId))
      }
    }
    dashboardStore.fetchList().then((resp) => {
      if (parseInt(dashboardId) > 0) {
        dashboardStore.selectDashboardById(dashboardId);
      }
    });
  }, [siteId]);

  return (
    <Loader loading={loading} className='mt-12'>
      <DashboardRouter />
    </Loader>
  );
}

export default withPermissions(['METRICS'])(observer(NewDashboard))
