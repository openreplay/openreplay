import { IconNames } from 'App/components/ui/SVG';
import React from 'react';
import { Icon } from 'UI';

export interface MetricType {
  title: string;
  icon?: IconNames;
  description: string;
  slug: string;
}

interface Props {
  metric: MetricType;
  onClick?: any;
}

function MetricTypeItem(props: Props) {
  const {
    metric: { title, icon, description, slug },
    onClick = () => {},
  } = props;
  return (
    <div
      className="flex items-start p-4 hover:bg-active-blue cursor-pointer group hover-color-teal"
      onClick={onClick}
    >
      <div className="pr-4 pt-1">
        <Icon name={icon} size="20" />
      </div>
      <div className="flex flex-col items-start text-left">
        <div className="text-base group-hover:color-teal">{title}</div>
        <div className="text-xs">{description}</div>
      </div>
    </div>
  );
}

export default MetricTypeItem;
