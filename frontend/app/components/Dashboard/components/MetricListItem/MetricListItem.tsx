import React from 'react';
import { Icon, Link } from 'UI';
import { checkForRecent } from 'App/date';
import { Tooltip } from 'react-tippy'
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId } from 'App/routes';

interface Props extends RouteComponentProps {
    metric: any;
    siteId: string;
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
    const { metric, history, siteId } = props;

    const onItemClick = () => {
        const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
        history.push(path);
    };
    return (
        <div className="grid grid-cols-12 py-4 border-t select-none hover:bg-active-blue cursor-pointer px-6" onClick={onItemClick}>
            <div className="col-span-4 flex items-start">
                <div className="flex items-center">
                    <MetricTypeIcon type={metric.metricType} />
                    <div className="link capitalize-first">
                        {metric.name}
                    </div>
                </div>
            </div>
            <div className="col-span-4">{metric.owner}</div>
            <div className="col-span-2">
                <div className="flex items-center">
                    <Icon name={metric.isPublic ? "user-friends" : "person-fill"} className="mr-2" />
                    <span>{metric.isPublic ? 'Team' : 'Private'}</span>
                </div>
            </div>
            <div className="col-span-2 text-right">{metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}</div>
        </div>
    );
}

export default withRouter(MetricListItem);
