import React from 'react';
import { useStore } from 'App/mstore';
import { SideMenuitem, SideMenuHeader, Icon, Button } from 'UI';
import { withSiteId, dashboardSelected, metrics } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { useModal } from 'App/components/Modal';

interface Props {
    siteId: string
    history: any
}
function DashbaordListModal(props: Props) {
    const { dashboardStore } = useStore();
    const { hideModal } = useModal();
    const dashboards = dashboardStore.dashboards;
    const activeDashboardId = dashboardStore.selectedDashboard?.dashboardId;

    const onItemClick = (dashboard) => {
        dashboardStore.selectDashboardById(dashboard.dashboardId);
        const path = withSiteId(dashboardSelected(dashboard.dashboardId), parseInt(props.siteId));
        props.history.push(path);
        hideModal();
    };
    return (
        <div className="bg-white h-screen" style={{ width: '300px'}}>
            <div className="color-gray-medium uppercase p-4 text-lg">Dashboards</div>
            <div>
                {dashboards.map((item: any) => (
                    <div key={ item.dashboardId } className="px-4">
                        <SideMenuitem
                            key={ item.dashboardId }
                            active={item.dashboardId === activeDashboardId}
                            title={ item.name }
                            iconName={ item.icon }
                            onClick={() => onItemClick(item)} // TODO add click handler
                            leading = {(
                                <div className="ml-2 flex items-center">
                                    {item.isPublic && <div className="p-1"><Icon name="user-friends" color="gray-light" size="16" /></div>}
                                </div>
                            )}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default withRouter(DashbaordListModal);
