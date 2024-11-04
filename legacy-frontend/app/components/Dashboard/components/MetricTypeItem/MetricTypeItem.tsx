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
  isList?: boolean;
}

function MetricTypeItem(props: Props) {
  const {
    metric: { title, icon, description, slug, disabled },
    onClick = () => {
    },
    isList = false
  } = props;
  return (
    <Tooltip disabled={!disabled} title={ENTERPRISE_REQUEIRED} delay={0}>
      <div
        className={cn(
          'rounded color-gray-darkest flex border border-transparent p-4 hover:bg-active-blue cursor-pointer group gap-4',
          {
            'opacity-30 pointer-events-none': disabled,
            'flex-col items-center gap-4 text-center': !isList,
            'items-start': isList
          }
        )}
        onClick={onClick}
      >
        <div className=''>
          {/* @ts-ignore */}
          <Icon name={icon} size='40' color='gray-dark' />
        </div>
        <div className={cn('flex flex-col text-left', { 'items-center text-center': !isList })}>
          <div className='text-base'>{title}</div>
          <div className='text-sm color-gray-medium font-normal'>{description}</div>
        </div>
      </div>
    </Tooltip>
  );
}

export default MetricTypeItem;
