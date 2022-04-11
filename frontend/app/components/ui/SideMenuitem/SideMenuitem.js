import React from 'react';
import { Icon, Popup } from 'UI';
import cn from 'classnames';
import stl from './sideMenuItem.css';

function SideMenuitem({
    iconBg = false,
    iconColor = "gray-dark",
    iconSize = 18,
    className, 
    iconName = null,
    title,
    active = false,
    disabled = false,
    onClick,
    deleteHandler,
    leading = null,
    ...props
  }) {
  return (
    <Popup
      trigger={
        <div
          className={ cn(
            className,
            stl.menuItem,
            "flex items-center py-2 justify-between",
            { [stl.active] : active }
          )}
          onClick={disabled ? null : onClick}
          {...props}
        >
          <div className={ cn('flex items-center w-full', { [stl.disabled] : disabled })}>
           <div className={cn("flex items-center", stl.iconLabel)}>
            { iconName && (
                <div className="flex items-center justify-center w-8 h-8 mr-2">
                  <div className={cn({ "w-8 h-8 rounded-full relative opacity-20" : iconBg }, iconBg)} style={{ opacity: '0.2'}} />
                  <Icon name={ iconName } size={ iconSize } color={active ? 'teal' : iconColor} className="absolute" />
                </div>
              )}
              <span className={stl.title}>{ title }</span>
           </div>
            { leading && leading }
          </div>
          {deleteHandler &&
            <div onClick={deleteHandler} className={stl.actions}><Icon name="trash" size="14" /></div>
          }
        </div>
      }
      disabled={ !disabled }
      content={ 'No recordings' }
      size="tiny"
      inverted
      position="left center"
    />
  )
}

export default SideMenuitem
