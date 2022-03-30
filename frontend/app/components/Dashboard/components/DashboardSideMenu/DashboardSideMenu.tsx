import { useObserver, observer, useLocalObservable } from 'mobx-react-lite';
import React from 'react';
import { SideMenuitem, SideMenuHeader, Icon, Button } from 'UI';
import { useStore } from 'App/mstore';
import { withRouter } from 'react-router-dom';
import { withSiteId, dashboardSelected, dashboardMetrics } from 'App/routes';
import { useModal } from 'App/components/Modal';
import DashbaordListModal from '../DashbaordListModal';
import DashboardModal from '../DashboardModal';

const SHOW_COUNT = 5;
function DashboardSideMenu(props) {
    const { hideModal, showModal } = useModal();
    const { history } = props;
    const { dashboardStore } = useStore();
    const dashboardId = dashboardStore.selectedDashboard?.dashboardId;
    const dashboardsPicked = dashboardStore.dashboards.slice(0, SHOW_COUNT);
    const remainingDashboardsCount = dashboardStore.dashboards.length - SHOW_COUNT;
    
    // React.useEffect(() => {
    //     showModal(<DashbaordListModal />, {});
    // }, []);

    const redirect = (path) => {
        history.push(path);
    }

    const onItemClick = (dashboard) => {
        dashboardStore.selectDashboardById(dashboard.dashboardId);
        const path = withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(dashboardStore.siteId));
        history.push(path);
    };

    const onAddDashboardClick = (e) => {
        dashboardStore.initDashboard();
        showModal(<DashboardModal />, {})
    }

    return (
        <div>
            <SideMenuHeader className="mb-4" text="Dashboards" />
            {dashboardsPicked.map((item: any) => (
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
            <div>
                {remainingDashboardsCount > 0 && (
                    <div
                        className="my-2 py-2 color-teal cursor-pointer"
                        onClick={() => showModal(<DashbaordListModal />, {})}
                    >
                        {remainingDashboardsCount} More
                    </div>
                )}
            </div>
            <div className="border-t w-full my-2" />
            <div className="w-full">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Create Dashboard"
					iconName="plus"
					onClick={onAddDashboardClick}
				/>
			</div>
            <div className="border-t w-full my-2" />
            <div className="w-full">
				<SideMenuitem
					id="menu-manage-alerts"
					title="Metrics"
					iconName="bar-chart-line"
					onClick={() => redirect(withSiteId(dashboardMetrics(), dashboardStore.siteId))}
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

export default withRouter(observer(DashboardSideMenu));