import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';

interface Props {
  title: string;
  icon?: string;
  iconColor?: string;
  iconBgColor?: string;
  children: React.ReactNode;
  className?: string;
}
function DocCard(props: Props) {
  const { className = '', iconColor = 'tealx', iconBgColor = 'bg-tealx-light' } = props;

  return (
    <div className={cn('p-5 bg-gray-lightest mb-4 rounded', className)}>
      <div className="font-medium mb-2 flex items-center">
        {props.icon && (
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2',
              iconBgColor
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
