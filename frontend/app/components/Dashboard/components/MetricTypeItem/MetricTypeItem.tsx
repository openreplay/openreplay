import { Icon } from '@/ui/icons/Icon';
import { IconNames } from '@/ui/icons/SVG';
import { Tooltip } from '@/ui/overlays/tooltip';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const {
    metric: { title, icon, description, slug, disabled },
    onClick = () => {},
    isList = false,
  } = props;
  return (
    <Tooltip title={disabled ? ENTERPRISE_REQUEIRED(t) : null} delay={0}>
      <div
        className={cn(
          'rounded-sm text-content-primary flex border border-transparent p-4 hover:bg-surface-hover cursor-pointer group gap-4',
          {
            'opacity-30 pointer-events-none': disabled,
            'flex-col items-center gap-4 text-center': !isList,
            'items-start': isList,
          },
        )}
        onClick={onClick}
      >
        <div className="">
          {/* @ts-ignore */}
          <Icon name={icon} size="40" color="gray-dark" />
        </div>
        <div
          className={cn('flex flex-col text-left', {
            'items-center text-center': !isList,
          })}
        >
          <div className="text-base">{title}</div>
          <div className="text-sm text-content-muted font-normal">
            {description}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

export default MetricTypeItem;
