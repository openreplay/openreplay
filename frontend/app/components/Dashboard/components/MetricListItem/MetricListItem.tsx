import React from 'react';
import { Icon, Link, Popup } from 'UI';
import { checkForRecent } from 'App/date';
import { Tooltip } from 'react-tippy'

interface Props {
    metric: any;
}

function DashboardLink({ dashboards}: any) {
    return (
        dashboards.map((dashboard: any) => (
            <React.Fragment key={dashboard.dashboardId}>
            <Link to={`/dashboard/${dashboard.dashboardId}`}>
                <div className="flex items-center mb-1 py-1">
                    <div className="mr-2">
                        <Icon name="circle-fill" size={4} color="gray-medium" />
                    </div>
                    <span className="link leading-4 capitalize-first">{dashboard.name}</span>
                </div>
            </Link>
            </React.Fragment>
        ))
    );
}

function MetricTypeIcon({ type }: any) {
    const getIcon = () => {
        switch (type) {
            case 'funnel':
                return 'filter';
            case 'table':
                return 'list-alt';
            case 'timeseries':
                return 'bar-chart-line';
        }
    }

    return (
        <Tooltip
            html={<div className="capitalize">{type}</div>}
            position="top"
            arrow
        >
            <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
                <Icon name={getIcon()} size="16" color="tealx" />
            </div>
        </Tooltip>
    )
}

function MetricListItem(props: Props) {
    const { metric } = props;

    
    return (
        <div className="grid grid-cols-12 py-4 border-t select-none">
            <div className="col-span-3 flex items-start">
                <div className="flex items-center">
                    <MetricTypeIcon type={metric.metricType} />
                    <Link to={`/metrics/${metric.metricId}`} className="link capitalize-first">
                        {metric.name}
                    </Link>
                </div>
            </div>
            <div className="col-span-3">{metric.owner}</div>
            <div className="col-span-4">
                <div className="flex items-center">
                    <Icon name={metric.isPublic ? "user-friends" : "person-fill"} className="mr-2" />
                    <span>{metric.isPublic ? 'Team' : 'Private'}</span>
                </div>
            </div>
            <div className="col-span-2 text-right">{metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}</div>
        </div>
    );
}

export default MetricListItem;
