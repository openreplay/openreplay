import React from 'react';
import { SideMenuitem } from 'UI';
import { withSiteId, metrics, dashboard, alerts } from 'App/routes';
import { useLocation, useNavigate } from "react-router";

interface Props {
  siteId: string;
}
function DashboardSideMenu(props: Props) {
  const { siteId } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const isMetric = location.pathname.includes('metrics');
  const isDashboards = location.pathname.includes('dashboard');
  const isAlerts = location.pathname.includes('alerts');

  const redirect = (path: string) => {
    navigate(path);
  };

  return (
    <div>
      {/* <SideMenuHeader className="mb-4 flex items-center" text="Dashboard" /> */}
      <div className="w-full">
        <SideMenuitem
          active={isDashboards}
          id="menu-manage-alerts"
          title="Dashboards"
          iconName="columns-gap"
          onClick={() => redirect(withSiteId(dashboard(), siteId))}
        />
      </div>
      <div className="w-full my-2" />
      <div className="w-full">
        <SideMenuitem
          active={isMetric}
          id="menu-manage-alerts"
          title="Cards"
          iconName="card-text"
          onClick={() => redirect(withSiteId(metrics(), siteId))}
        />
      </div>
      <div className="w-full my-2" />
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

export default DashboardSideMenu;
