import React from 'react'
import cn from 'classnames';
import stl from './alertItem.css';
import AlertTypeLabel from './AlertTypeLabel';

const AlertItem = props => {
  const { alert, onEdit, active } = props;

  const getThreshold = threshold => {
    if (threshold === 15) return '15 Minutes';
    if (threshold === 30) return '30 Minutes';
    if (threshold === 60) return '1 Hour';
    if (threshold === 120) return '2 Hours';
    if (threshold === 240) return '4 Hours';
    if (threshold === 1440) return '1 Day';
  }

  const getNotifyChannel = alert => {
    let str = '';
    if (alert.slack)
      str = 'Slack';
    if (alert.email)
      str += (str === '' ? '' : ' and ')+ 'Email';
    if (alert.webhool)
      str += (str === '' ? '' : ' and ')+ 'Webhook';
    if (str === '')
      return 'OpenReplay';

    return str;
  }

  const isThreshold = alert.detectionMethod === 'threshold';

  return (
    <div
      className={cn(stl.wrapper, 'p-4 py-6 relative group cursor-pointer', { [stl.active]: active })}
      onClick={onEdit}
      id="alert-item"
    >  
      <AlertTypeLabel type={alert.detectionMethod} />
      <div className="capitalize font-medium">{alert.name}</div>
      <div className="mt-2 text-sm color-gray-medium">
        {alert.detectionMethod === 'threshold' && (
          <div>When <span className="italic font-medium">{alert.metric.text}</span> is {alert.condition.text} <span className="italic font-medium">{alert.query.right} {alert.metric.unit}</span> over the past <span className="italic font-medium">{getThreshold(alert.currentPeriod)}</span>, notify me on <span>{getNotifyChannel(alert)}</span>.</div>
        )}

        {alert.detectionMethod === 'change' && (
          <div>When the <span className="italic font-medium">{alert.options.change}</span> of <span className="italic font-medium">{alert.metric.text}</span> is {alert.condition.text} <span className="italic font-medium">{alert.query.right} {alert.metric.unit}</span> over the past <span className="italic font-medium">{getThreshold(alert.currentPeriod)}</span> compared to the previous <span className="italic font-medium">{getThreshold(alert.previousPeriod)}</span>, notify me on {getNotifyChannel(alert)}.</div>
        )}
      </div>
    </div>
  )
}

export default AlertItem
