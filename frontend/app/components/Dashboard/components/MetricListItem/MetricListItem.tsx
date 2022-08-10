import React from 'react';
import { Icon, NoContent, Label, Link, Pagination, Popup } from 'UI';
import { checkForRecent, formatDateTimeDefault, convertTimestampToUtcTimestamp } from 'App/date';
import { getIcon } from 'react-toastify/dist/components';

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
    const PopupWrapper = (props: any) => {
        return (
            <Popup
                content={<div className="capitalize">{type}</div>}
                position="top center"
                on="hover"
                hideOnScroll={true}
            >
                {props.children}
            </Popup>
        );
    }

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
        <PopupWrapper>
            <div className="w-8 h-8 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
                <Icon name={getIcon()} size="14" color="tealx" />
            </div>
        </PopupWrapper>
    )
}

function MetricListItem(props: Props) {
    const { metric } = props;

    
    return (
        <div className="grid grid-cols-12 p-3 border-t select-none">
            <div className="col-span-3 flex items-start">
                <div className="flex items-center">
                    {/* <div className="w-8 h-8 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
                        <Icon name={getIcon(metric.metricType)} size="14" color="tealx"  />
                    </div> */}
                    <MetricTypeIcon type={metric.metricType} />
                    <Link to={`/metrics/${metric.metricId}`} className="link capitalize-first">
                        {metric.name}
                    </Link>
                </div>
            </div>
            {/* <div><Label className="capitalize">{metric.metricType}</Label></div> */}
            <div className="col-span-2">
                <DashboardLink dashboards={metric.dashboards} />
            </div>
            <div className="col-span-3">{metric.owner}</div>
            <div>
                <div className="flex items-center">
                    <Icon name={metric.isPublic ? "user-friends" : "person-fill"} className="mr-2" />
                    <span>{metric.isPublic ? 'Team' : 'Private'}</span>
                </div>
            </div>
            <div className="col-span-2">{metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}</div>
        </div>
    );
}

export default MetricListItem;
