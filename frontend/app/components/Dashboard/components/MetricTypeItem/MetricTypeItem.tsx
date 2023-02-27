import { IconNames } from 'App/components/ui/SVG';
import React from 'react';
import { Icon, Tooltip } from 'UI';
import cn from 'classnames';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

export interface MetricType {
  title: string;
  icon?: IconNames;
  description: string;
  slug: string;
  disabled?: boolean;
  tooltipTitle?: string;
}

interface Props {
  metric: MetricType;
  onClick?: any;
}

function MetricTypeItem(props: Props) {
  const {
    metric: { title, icon, description, slug, disabled },
    onClick = () => {},
  } = props;
  return (
    <Tooltip disabled={!disabled} title={ENTERPRISE_REQUEIRED} delay={0}>
      <div
        className={cn(
          'rounded color-gray-darkest flex items-start border border-transparent p-4 hover:bg-active-blue cursor-pointer group hover-color-teal',
          { 'opacity-30 pointer-events-none': disabled }
        )}
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
    </Tooltip>
  );
}

export default MetricTypeItem;
