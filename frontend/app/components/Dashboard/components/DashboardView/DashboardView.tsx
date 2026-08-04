import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { withSiteId } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import { RouteComponentProps, useHistory } from 'App/routing';
import { useModal } from 'App/components/Modal';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import withPageTitle from 'HOCs/withPageTitle';
import withReport from 'App/components/hocs/withReport';
import DashboardHeader from '../DashboardHeader';
import DashboardMetrics from '../DashboardMetrics';
import DashboardSessions from '../DashboardSessions';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import { PANEL_SIZES } from 'App/constants/panelSizes';

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

  // Which issue the metric cards are filtering the session list by, if any.
  const [issue, setIssue] = React.useState<string[] | null>(null);

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
    });
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
        className="flex flex-col gap-4"
      >
        <div className="rounded-lg shadow-xs bg-white border">
          {/* @ts-ignore */}
          <DashboardHeader
            renderReport={props.renderReport}
            siteId={siteId}
            dashboardId={dashboardId}
          />

          {/*
            Left: core metrics — is it recording, is anything broken.
            Right: the sessions themselves, which are what the user actually came for.
            Clicking a metric filters the list rather than navigating away.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 pb-4 pt-2">
            <div className="lg:col-span-4 xl:col-span-3">
              <DashboardMetrics
                siteId={siteId}
                activeFilter={issue}
                onFilter={setIssue}
              />
            </div>
            <div className="lg:col-span-8 xl:col-span-9">
              <DashboardSessions siteId={siteId} issue={issue} />
            </div>
          </div>
        </div>

        <div className="rounded-lg shadow-xs bg-white border overflow-hidden">
          <DashboardWidgetGrid
            siteId={siteId}
            dashboardId={dashboardId}
            id="report"
          />
        </div>
      </div>
    </Loader>
  );
}

// @ts-ignore
export default withPageTitle('Dashboards - OpenReplay')(
  withReport(withModal(observer(DashboardView))),
);
