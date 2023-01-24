import React, { useEffect, useState } from 'react';
import { Icon, Checkbox, Tooltip } from 'UI';
import { checkForRecent } from 'App/date';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId } from 'App/routes';
import { TYPES } from 'App/constants/card';
import cn from 'classnames';

interface Props extends RouteComponentProps {
  metric: any;
  siteId: string;
  selected?: boolean;
  toggleSelection?: any;
  disableSelection?: boolean;
}

function MetricTypeIcon({ type }: any) {
  const [card, setCard] = useState<any>('');
  useEffect(() => {
    const t = TYPES.find((i) => i.slug === type);
    setCard(t);
  }, [type]);

  return (
    <Tooltip delay={0} title={<div className="capitalize">{card.title}</div>}>
      <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
        {card.icon && <Icon name={card.icon} size="16" color="tealx" />}
      </div>
    </Tooltip>
  );
}

function MetricListItem(props: Props) {
  const {
    metric,
    history,
    siteId,
    selected,
    toggleSelection = () => {},
    disableSelection = false,
  } = props;

  const onItemClick = (e: React.MouseEvent) => {
    if (!disableSelection) {
      return toggleSelection(e);
    }
    const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
    history.push(path);
  };

  return (
    <div
      className="grid grid-cols-12 py-4 border-t select-none items-center hover:bg-active-blue cursor-pointer px-6"
      onClick={onItemClick}
    >
      <div className="col-span-4 flex items-center">
        {!disableSelection && (
          <Checkbox
            name="slack"
            className="mr-4"
            type="checkbox"
            checked={selected}
            onClick={toggleSelection}
          />
        )}

        <div className="flex items-center">
          <MetricTypeIcon type={metric.metricType} />
          <div className={cn('capitalize-first', { link: disableSelection })}>{metric.name}</div>
        </div>
      </div>
      <div className="col-span-4">{metric.owner}</div>
      <div className="col-span-2">
        <div className="flex items-center">
          <Icon name={metric.isPublic ? 'user-friends' : 'person-fill'} className="mr-2" />
          <span>{metric.isPublic ? 'Team' : 'Private'}</span>
        </div>
      </div>
      <div className="col-span-2 text-right">
        {metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}
      </div>
    </div>
  );
}

export default withRouter(MetricListItem);
