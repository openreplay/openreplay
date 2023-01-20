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
      className="rounded color-gray-darkest flex items-start border border-transparent p-4 hover:bg-active-blue hover:!border-active-blue-border cursor-pointer group hover-color-teal"
      onClick={onClick}
    >
      <div className="pr-4 pt-1">
        {/* @ts-ignore */}
        <Icon name={icon} size="20" color="gray-dark" />
      </div>
      <div className="flex flex-col items-start text-left">
        <div className="text-base">{title}</div>
        <div className="text-sm color-gray-medium font-normal">{description}</div>
      </div>
    </div>
  );
}

export default MetricTypeItem;
