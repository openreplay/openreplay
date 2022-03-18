import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { SideMenuitem, SideMenuHeader } from 'UI';
import { withDashboardStore } from '../../store/store';

function DashboardSideMenu(props) {
    const { store } = props;
    const { selectedDashboard } = store;

    const onItemClick = (dashboard) => {
        store.selectDashboardById(dashboard.dashboardId);
    };

    return useObserver(() => (
        <div>
            <SideMenuHeader className="mb-4" text="Dashboards" />
            {store.dashboards.map(item => (
                <SideMenuitem
                    key={ item.key }		      	
                    active={ item.active }
                    title={ item.name }
                    iconName={ item.icon }
                    onClick={() => onItemClick(item)}
                />
            ))}
            <div className="border-t w-full my-2" />
            <div className="">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Metrics"
					iconName="bar-chart-line"
					// onClick={() => setShowAlerts(true)}
				/>				
			</div>
            <div className="border-t w-full my-2" />
            <div className="my-3">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Alerts"
					iconName="bell-plus"
					// onClick={() => setShowAlerts(true)}
				/>				
			</div>
        </div>
    ));
}

export default withDashboardStore(DashboardSideMenu);