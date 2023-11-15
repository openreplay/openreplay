import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { withSiteId } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import DashboardModal from '../DashboardModal';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import withPageTitle from 'HOCs/withPageTitle';
import withReport from 'App/components/hocs/withReport';
import DashboardHeader from '../DashboardHeader';

interface IProps {
  siteId: string;
  dashboardId: any;
  renderReport?: any;
}

type Props = IProps & RouteComponentProps;

function DashboardView(props: Props) {
  const { siteId, dashboardId } = props;
  const { dashboardStore } = useStore();
  const { showModal } = useModal();

  const showAlertModal = dashboardStore.showAlertModal;
  const loading = dashboardStore.fetchingDashboard;
  const dashboard: any = dashboardStore.selectedDashboard;

  const queryParams = new URLSearchParams(props.location.search);

  const trimQuery = () => {
    if (!queryParams.has('modal')) return;
    queryParams.delete('modal');
    props.history.replace({
      search: queryParams.toString(),
    });
  };

  const pushQuery = () => {
    if (!queryParams.has('modal')) props.history.push('?modal=addMetric');
  };

  useEffect(() => {
    if (queryParams.has('modal')) {
      onAddWidgets();
      trimQuery();
    }
  }, []);

  useEffect(() => {
    const isExists = dashboardStore.getDashboardById(dashboardId);
    if (!isExists) {
      props.history.push(withSiteId(`/dashboard`, siteId));
    }
  }, [dashboardId]);

  useEffect(() => {
    if (!dashboard || !dashboard.dashboardId) return;
    dashboardStore.fetch(dashboard.dashboardId);
  }, [dashboard]);

  const onAddWidgets = () => {
    dashboardStore.initDashboard(dashboard);
    showModal(
      <DashboardModal siteId={siteId} onMetricAdd={pushQuery} dashboardId={dashboardId} />,
      { right: true }
    );
  };

  if (!dashboard) return null;

  return (
    <Loader loading={loading}>
      <div style={{ maxWidth: '1360px', margin: 'auto' }}>
        {/* @ts-ignore */}
        <DashboardHeader renderReport={props.renderReport} siteId={siteId} dashboardId={dashboardId} />

        <DashboardWidgetGrid
          siteId={siteId}
          dashboardId={dashboardId}
          onEditHandler={onAddWidgets}
          id="report"
        />
        <AlertFormModal
          showModal={showAlertModal}
          onClose={() => dashboardStore.toggleAlertModal(false)}
        />
      </div>
    </Loader>
  );
}
// @ts-ignore
export default withPageTitle('Dashboards - OpenReplay')(
  withReport(withRouter(withModal(observer(DashboardView))))
);
