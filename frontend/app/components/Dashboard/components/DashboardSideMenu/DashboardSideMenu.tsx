import { useObserver, observer, useLocalObservable } from 'mobx-react-lite';
import React from 'react';
import { SideMenuitem, SideMenuHeader, Icon } from 'UI';
import { withDashboardStore } from '../../store/store';
import { withRouter } from 'react-router-dom';
import { withSiteId, dashboardSelected, dashboardMetrics } from 'App/routes';

function DashboardSideMenu(props) {
    const { store, history } = props;
    const { dashboardId } = store.selectedDashboard;

    const redirect = (path) => {
        history.push(path);
    }

    const onItemClick = (dashboard) => {
        store.selectDashboardById(dashboard.dashboardId);
        const path = withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(store.siteId));
        history.push(path);
    };

    return (
        <div>
            <SideMenuHeader className="mb-4" text="Dashboards" />
            {store.dashboards.map(item => (
                <SideMenuitem
                    key={ item.dashboardId }
                    active={item.dashboardId === dashboardId}
                    title={ item.name }
                    iconName={ item.icon }
                    onClick={() => onItemClick(item)}
                    
                    leading = {(
                        <div className="ml-2 flex items-center">
                            <div className="p-1"><Icon name="user-friends" color="gray-light" size="16" /></div>
                            {item.isPinned && <div className="p-1"><Icon name="pin-fill" size="16" /></div>}
                        </div>
                    )}
                />
            ))}
            <div className="border-t w-full my-2" />
            <div className="w-full">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Metrics"
					iconName="bar-chart-line"
					onClick={() => redirect(withSiteId(dashboardMetrics(), store.siteId))}
				/>
			</div>
            <div className="border-t w-full my-2" />
            <div className="my-3 w-full">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Alerts"
					iconName="bell-plus"
					// onClick={() => setShowAlerts(true)}
				/>				
			</div>
        </div>
    );
}

export default withDashboardStore(withRouter(observer(DashboardSideMenu)));