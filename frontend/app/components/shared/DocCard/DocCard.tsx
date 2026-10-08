import { Icon } from '@/ui/icons/Icon';
import cn from 'classnames';
import React from 'react';

interface Props {
  title: string;
  icon?: string;
  iconColor?: string;
  iconBgColor?: string;
  children: React.ReactNode;
  className?: string;
}
function DocCard(props: Props) {
  const {
    className = '',
    iconColor = 'tealx',
    iconBgColor = 'bg-surface-selected',
  } = props;

  return (
    <div className={cn('p-5 bg-surface-sunken mb-4 rounded-lg', className)}>
      <div className="font-medium mb-2 flex items-center">
        {props.icon && (
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2',
              iconBgColor,
            )}
          >
            {/* @ts-ignore */}
            <Icon name={props.icon} size={18} color={iconColor} />
          </div>
        )}
        <span>{props.title}</span>
      </div>
      <div>{props.children}</div>
    </div>
  );
}

export default DocCard;
