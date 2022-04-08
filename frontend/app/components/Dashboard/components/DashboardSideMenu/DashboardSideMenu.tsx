import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { SideMenuitem, SideMenuHeader, Icon, Button } from 'UI';
import { useStore } from 'App/mstore';
import { withRouter } from 'react-router-dom';
import { withSiteId, dashboardSelected, metrics } from 'App/routes';
import { useModal } from 'App/components/Modal';
import DashbaordListModal from '../DashbaordListModal';
import DashboardModal from '../DashboardModal';
import cn from 'classnames';

const SHOW_COUNT = 5;
interface Props {
    siteId: string
    history: any
}
function DashboardSideMenu(props: Props) {
    const { history, siteId } = props;
    const { hideModal, showModal } = useModal();
    const { dashboardStore } = useStore();
    const dashboardId = dashboardStore.selectedDashboard?.dashboardId;
    const dashboardsPicked = useObserver(() => dashboardStore.dashboards.slice(0, SHOW_COUNT));
    const remainingDashboardsCount = dashboardStore.dashboards.length - SHOW_COUNT;

    const redirect = (path) => {
        history.push(path);
    }

    const onItemClick = (dashboard) => {
        dashboardStore.selectDashboardById(dashboard.dashboardId);
        const path = withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(siteId));
        history.push(path);
    };

    const onAddDashboardClick = (e) => {
        dashboardStore.initDashboard();
        showModal(<DashboardModal />, {})
    }

    const togglePinned = (dashboard) => {
        dashboardStore.updatePinned(dashboard.dashboardId);
    }

    return useObserver(() => (
        <div>
            <SideMenuHeader className="mb-4" text="Dashboards" />
            {dashboardsPicked.sort((a: any, b: any) => a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1 ).map((item: any) => (
                <SideMenuitem
                    key={ item.dashboardId }
                    active={item.dashboardId === dashboardId}
                    title={ item.name }
                    iconName={ item.icon }
                    onClick={() => onItemClick(item)}
                    className="group"
                    leading = {(
                        <div className="ml-2 flex items-center">
                            {item.isPublic && <div className="p-1"><Icon name="user-friends" color="gray-light" size="16" /></div>}
                            {<div className={cn("p-1 group-hover:visible", { 'invisible' : !item.isPinned })} onClick={() => togglePinned(item)}><Icon name="pin-fill" size="16" /></div>}
                        </div>
                    )}
                />
            ))}
            <div>
                {remainingDashboardsCount > 0 && (
                    <div
                        className="my-2 py-2 color-teal cursor-pointer"
                        onClick={() => showModal(<DashbaordListModal siteId={siteId} />, {})}
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
					onClick={() => redirect(withSiteId(metrics(), siteId))}
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
    ));
}

export default withRouter(DashboardSideMenu);