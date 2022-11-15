import React from 'react';
import cn from 'classnames';
import stl from './funnelMenuItem.module.css';
import { Icon, Tooltip } from 'UI';

function FunnelMenuItem({
  iconName = 'info',
  className,
  title,
  active = false,
  disabled = false,
  isPublic = false,
  onClick,
}) {
  return (
    <div
      className={cn(className, stl.menuItem, 'flex items-center py-1 justify-between group', {
        [stl.active]: active,
      })}
      onClick={disabled ? null : onClick}
    >
      <div className={cn(stl.iconLabel, 'flex items-center', { [stl.disabled]: disabled })}>
        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
          <Icon name={iconName} size={16} color={'gray-dark'} className="absolute" />
        </div>
        <span className={cn(stl.title, 'cap-first')}>{title}</span>
      </div>
      <div className="flex items-center">
        <div className={cn('mx-2', { invisible: !isPublic })}>
          <Tooltip title={`Shared with team`}>
            <div
              className={cn(
                'bg-gray-light h-8 w-8 rounded-full flex items-center justify-center',
                stl.teamIcon
              )}
              style={{ opacity: '0.3' }}
            >
              <Icon name="user-friends" color="gray-dark" size={16} />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default FunnelMenuItem;
