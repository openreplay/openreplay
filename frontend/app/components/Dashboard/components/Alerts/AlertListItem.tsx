import React from 'react';
import { Icon } from 'UI';
import { checkForRecent } from 'App/date';
import { withSiteId, alertEdit } from 'App/routes';
// @ts-ignore
import { DateTime } from 'luxon';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';

const getThreshold = (threshold: number) => {
  if (threshold === 15) return '15 Minutes';
  if (threshold === 30) return '30 Minutes';
  if (threshold === 60) return '1 Hour';
  if (threshold === 120) return '2 Hours';
  if (threshold === 240) return '4 Hours';
  if (threshold === 1440) return '1 Day';
};

const getNotifyChannel = (alert: Record<string, any>, webhooks: Array<any>) => {
  // @ts-ignore god damn you immutable
  if (webhooks.size === 0) {
    return 'OpenReplay';
  }
  const getSlackChannels = () => {
    return (
      ' (' +
      alert.slackInput
        .map((channelId: number) => {
          return (
            '#' +
            webhooks.find((hook) => hook.webhookId === channelId && hook.type === 'slack').name
          );
        })
        .join(', ') +
      ')'
    );
  };
  let str = '';
  if (alert.slack) {
    str = 'Slack';
    str += alert.slackInput.length > 0 ? getSlackChannels() : '';
  }
  if (alert.email) {
    str += (str === '' ? '' : ' and ') + (alert.emailInput.length > 1 ? 'Emails' : 'Email');
    str += alert.emailInput.length > 0 ? ' (' + alert.emailInput.join(', ') + ')' : '';
  }
  if (alert.webhook) str += (str === '' ? '' : ' and ') + 'Webhook';
  if (str === '') return 'OpenReplay';

  return str;
};

interface Props extends RouteComponentProps {
  alert: Alert;
  siteId: string;
  init: (alert?: Alert) => void;
  demo?: boolean;
  webhooks: Array<any>;
}

function AlertListItem(props: Props) {
  const { alert, siteId, history, init, demo, webhooks } = props;

  if (!alert) {
    return null;
  }

  const onItemClick = () => {
    if (demo) return;
    const path = withSiteId(alertEdit(alert.alertId), siteId);
    init(alert);
    history.push(path);
  };

  return (
    <div
      className={cn('px-6', !demo ? 'hover:bg-active-blue cursor-pointer border-t' : '')}
      onClick={onItemClick}
    >
      <div className="grid grid-cols-12 py-4 select-none">
        <div className="col-span-8 flex items-start">
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
        <div className="col-span-2 text-right">
          {demo
            ? DateTime.fromMillis(+new Date()).toFormat('LLL dd, yyyy, hh:mm a')
            : checkForRecent(
                DateTime.fromMillis(alert.createdAt || +new Date()),
                'LLL dd, yyyy, hh:mm a'
              )}
        </div>
      </div>
      <div className="color-gray-medium px-2 pb-2">
        {'When the '}
        <span className="font-semibold" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>{alert.detectionMethod}</span>
        {' of '}
        <span className="font-semibold" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>{alert.query.left}</span>
        {' is '}
        <span className="font-semibold" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>
          {alert.query.operator}
          {alert.query.right} {alert.metric.unit}
        </span>
        {' over the past '}
        <span className="font-semibold" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>{getThreshold(alert.currentPeriod)}</span>
        {alert.detectionMethod === 'change' ? (
          <>
            {' compared to the previous '}
            <span className="font-semibold" style={{ fontFamily: 'Menlo, Monaco, Consolas ' }}>{getThreshold(alert.previousPeriod)}</span>
          </>
        ) : null}
        {', notify me on '}
        <span>{getNotifyChannel(alert, webhooks)}</span>.
      </div>
      {alert.description ? (
        <div className="color-gray-medium px-2 pb-2">{alert.description}</div>
      ) : null}
    </div>
  );
}

export default withRouter(AlertListItem);
