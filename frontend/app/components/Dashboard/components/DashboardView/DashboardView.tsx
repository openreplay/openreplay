import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { withSiteId } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import { RouteComponentProps } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import withPageTitle from 'HOCs/withPageTitle';
import withReport from 'App/components/hocs/withReport';
import { useHistory } from 'react-router';
import DashboardHeader from '../DashboardHeader';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import AiQuery from './AiQuery';
import { PANEL_SIZES } from 'App/constants/panelSizes'

interface IProps {
  siteId: string;
  dashboardId: any;
  renderReport?: any;
}

type Props = IProps & RouteComponentProps;

function DashboardView(props: Props) {
  const { siteId, dashboardId } = props;
  const { dashboardStore } = useStore();
  const { showModal, hideModal } = useModal();
  const history = useHistory();

  const { showAlertModal } = dashboardStore;
  const loading = dashboardStore.fetchingDashboard;
  const dashboard: any = dashboardStore.selectedDashboard;

  const queryParams = new URLSearchParams(location.search);

  const trimQuery = () => {
    if (!queryParams.has('modal')) return;
    queryParams.delete('modal');
    history.replace({
      search: queryParams.toString(),
    });
  };

  useEffect(() => {
    if (showAlertModal) {
      showModal(
        <AlertFormModal
          showModal={showAlertModal}
          onClose={() => {
            hideModal();
            dashboardStore.toggleAlertModal(false);
          }}
        />,
        { right: false, width: 580 },
        () => dashboardStore.toggleAlertModal(false),
      );
    }
  }, [showAlertModal]);

  const pushQuery = () => {
    if (!queryParams.has('modal')) history.push('?modal=addMetric');
  };

  useEffect(() => {
    dashboardStore.resetPeriod();
    if (queryParams.has('modal')) {
      onAddWidgets();
      trimQuery();
    }
    dashboardStore.resetDensity();

    return () => dashboardStore.resetSelectedDashboard();
  }, []);

  useEffect(() => {
    const isExists = async () => dashboardStore.getDashboardById(dashboardId);
    isExists().then((res) => {
      if (!res) {
        history.push(withSiteId('/dashboard', siteId));
      }
    })
  }, [dashboardId]);

  useEffect(() => {
    if (!dashboard || !dashboard.dashboardId) return;
    dashboardStore.fetch(dashboard.dashboardId);
  }, [dashboard]);

  if (!dashboard) return null;
  return (
    <Loader loading={loading}>
      <div
        style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}
        className="rounded-lg shadow-sm overflow-hidden bg-white border"
      >
        {/* @ts-ignore */}
        <DashboardHeader
          renderReport={props.renderReport}
          siteId={siteId}
          dashboardId={dashboardId}
        />
        <DashboardWidgetGrid
          siteId={siteId}
          dashboardId={dashboardId}
          id="report"
        />
      </div>
    </Loader>
  );
}

// @ts-ignore
export default withPageTitle('Dashboards - OpenReplay')(
  withReport(withModal(observer(DashboardView))),
);
