import React from 'react';
import { Icon, NoContent, Label, Link, Pagination } from 'UI';
import { checkForRecent, formatDateTimeDefault, convertTimestampToUtcTimestamp } from 'App/date';

interface Props {
    metric: any;
}

function DashboardLink({ dashboards}) {
    return (
        dashboards.map(dashboard => (
            <Link to={`/dashboard/${dashboard.dashboardId}`} className="">
                <div className="flex items-center">
                    <div className="mr-2 text-4xl no-underline" style={{ textDecoration: 'none'}}>·</div>
                    <span className="link">{dashboard.name}</span>
                </div>
            </Link>
        ))
    );
}

function MetricListItem(props: Props) {
    const { metric } = props;
    return (
        <div className="grid grid-cols-7 p-3 border-t select-none">
            <div className="col-span-2">
                <Link to={`/metrics/${metric.metricId}`} className="link">
                    {metric.name}
                </Link>
            </div>
            <div><Label className="capitalize">{metric.metricType}</Label></div>
            <div>
                <DashboardLink dashboards={metric.dashboards} />
            </div>
            <div>{metric.owner}</div>
            <div>
                <div className="flex items-center">
                    <Icon name={metric.isPublic ? "user-friends" : "person-fill"} className="mr-2" />
                    <span>{metric.isPublic ? 'Team' : 'Private'}</span>
                </div>
            </div>
            <div>{metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}</div>
        </div>
    );
}

export default MetricListItem;