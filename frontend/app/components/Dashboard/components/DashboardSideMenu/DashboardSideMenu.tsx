import React from 'react';
import { SideMenuitem, SideMenuHeader } from 'UI';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId, metrics, dashboard, alerts } from 'App/routes';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { setShowAlerts } from 'Duck/dashboard';

interface Props extends RouteComponentProps {
  siteId: string;
  history: any;
  setShowAlerts: (show: boolean) => void;
}
function DashboardSideMenu(props: Props) {
  const { history, siteId, setShowAlerts } = props;
  const isMetric = history.location.pathname.includes('metrics');
  const isDashboards = history.location.pathname.includes('dashboard');
  const isAlerts = history.location.pathname.includes('alerts');

  const redirect = (path: string) => {
    history.push(path);
  };

  return (
    <div>
      <SideMenuHeader className="mb-4 flex items-center" text="Preferences" />
      <div className="w-full">
        <SideMenuitem
          active={isDashboards}
          id="menu-manage-alerts"
          title="Dashboards"
          iconName="columns-gap"
          onClick={() => redirect(withSiteId(dashboard(), siteId))}
        />
      </div>
      <div className="border-t w-full my-2" />
      <div className="w-full">
        <SideMenuitem
          active={isMetric}
          id="menu-manage-alerts"
          title="Metrics"
          iconName="bar-chart-line"
          onClick={() => redirect(withSiteId(metrics(), siteId))}
        />
      </div>
      <div className="border-t w-full my-2" />
      <div className="w-full">
        <SideMenuitem
          active={isAlerts}
          id="menu-manage-alerts"
          title="Alerts"
          iconName="bell-plus"
          onClick={() => redirect(withSiteId(alerts(), siteId))}
        />
      </div>
    </div>
  );
}

export default compose(withRouter, connect(null, { setShowAlerts }))(DashboardSideMenu);
