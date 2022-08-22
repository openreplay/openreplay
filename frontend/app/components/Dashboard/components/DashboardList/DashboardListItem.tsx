import React from 'react';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import { IDashboard } from 'App/mstore/types/dashboard';
import { checkForRecent } from 'App/date';
import { withSiteId, dashboardSelected } from 'App/routes';
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';

interface Props extends RouteComponentProps {
    dashboard: IDashboard;
    siteId: string;
}

function DashboardListItem(props: Props) {
    const { dashboard, siteId, history } = props;
    const { dashboardStore } = useStore();

    const onItemClick = () => {
        dashboardStore.selectDashboardById(dashboard.dashboardId);
        const path = withSiteId(dashboardSelected(dashboard.dashboardId), siteId);
        history.push(path);
    };
    return (
        <div className="hover:bg-active-blue cursor-pointer border-t px-6" onClick={onItemClick}>
            <div className="grid grid-cols-12 py-4 select-none">
                <div className="col-span-8 flex items-start">
                    <div className="flex items-center capitalize-first">
                        <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
                            <Icon name="columns-gap" size="16" color="tealx" />
                        </div>
                        <div className="link capitalize-first">{dashboard.name}</div>
                    </div>
                </div>
                {/* <div><Label className="capitalize">{metric.metricType}</Label></div> */}
                <div className="col-span-2">
                    <div className="flex items-center">
                        <Icon name={dashboard.isPublic ? 'user-friends' : 'person-fill'} className="mr-2" />
                        <span>{dashboard.isPublic ? 'Team' : 'Private'}</span>
                    </div>
                </div>
                <div className="col-span-2 text-right">{checkForRecent(dashboard.createdAt, 'LLL dd, yyyy, hh:mm a')}</div>
            </div>
            {dashboard.description ? <div className="color-gray-medium px-2 pb-2">{dashboard.description}</div> : null}
        </div>
    );
}
// @ts-ignore
export default connect((state) => ({ siteId: state.getIn(['site', 'siteId']) }))(withRouter(DashboardListItem));
