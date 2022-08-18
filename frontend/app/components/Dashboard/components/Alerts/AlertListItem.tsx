import React from 'react';
import { Icon } from 'UI';
import { checkForRecent } from 'App/date';
import { withSiteId, alertCreate } from 'App/routes';
// @ts-ignore
import { DateTime } from 'luxon';
import { withRouter, RouteComponentProps } from 'react-router-dom';

const getThreshold = (threshold: number) => {
  if (threshold === 15) return '15 Minutes';
  if (threshold === 30) return '30 Minutes';
  if (threshold === 60) return '1 Hour';
  if (threshold === 120) return '2 Hours';
  if (threshold === 240) return '4 Hours';
  if (threshold === 1440) return '1 Day';
};

const getNotifyChannel = (alert: Record<string, string>) => {
  let str = '';
  if (alert.slack) str = 'Slack';
  if (alert.email) str += (str === '' ? '' : ' and ') + 'Email';
  if (alert.webhool) str += (str === '' ? '' : ' and ') + 'Webhook';
  if (str === '') return 'OpenReplay';

  return str;
};

interface Props extends RouteComponentProps {
  alert: Alert;
  siteId: string;
  init: (alert?: Alert) => void;
}

function AlertListItem(props: Props) {
  const { alert, siteId, history, init } = props;

  const onItemClick = () => {
    const path = withSiteId(alertCreate(), siteId);
    init(alert)
    history.push(path);
  };
  return (
    <div className="hover:bg-active-blue cursor-pointer border-t px-3" onClick={onItemClick}>
      <div className="grid grid-cols-12 py-4 select-none">
        <div className="col-span-5 flex items-start">
          <div className="flex items-center capitalize-first">
            <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
              <Icon name="bell" size="16" color="tealx" />
            </div>
            <div className="link capitalize-first">{alert.name}</div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="flex items-center uppercase">
            <span>{alert.detectionMethod}</span>
          </div>
        </div>
        <div className="col-span-5 text-right">
          {checkForRecent(DateTime.fromMillis(alert.createdAt), 'LLL dd, yyyy, hh:mm a')}
        </div>
      </div>
      <div className="text-disabled-text px-2 pb-2">
        {'When the '}
        <span className="font-medium">{alert.detectionMethod}</span>
        {' of '}
        <span className="font-medium">{alert.query.left}</span>
        {' is '}
        <span className="font-medium">
          {alert.query.operator}{alert.query.right} {alert.metric.unit}
        </span>
        {' over the past '}
        <span className="font-medium">{getThreshold(alert.currentPeriod)}</span>
        {alert.detectionMethod === 'change' ? (
          <>
            {' compared to the previous '}
            <span className="font-medium">{getThreshold(alert.previousPeriod)}</span>
          </>
        ) : null}
        {', notify me on '}
        <span>{getNotifyChannel(alert)}</span>.
      </div>
      {alert.description ? (
        <div className="text-disabled-text px-2 pb-2">{alert.description}</div>
      ) : null}
    </div>
  );
}

export default withRouter(AlertListItem);
