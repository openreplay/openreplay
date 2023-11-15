import React from 'react';
import cn from 'classnames';
import { avatarIconName } from 'App/iconNames';
import { Icon, Tooltip } from 'UI';

const Avatar = ({
                  isActive = false,
                  isAssist = false,
                  width = '38px',
                  height = '38px',
                  iconSize = 24,
                  seed
                }) => {
  var iconName = avatarIconName(seed);
  return (
    <Tooltip title={isActive ? 'Active user' : 'User might be inactive'} disabled={!isAssist}>
      <div
        className={cn(
          // stl.wrapper,
          'border flex items-center justify-center rounded-full relative bg-tealx-light'
        )}
        style={{ width, height }}
      >
        {/*<img src={`/assets/${iconName}`} width={iconSize} height={iconSize} />*/}
        <Icon name={iconName} size={iconSize} color='tealx' />
        {isAssist && (
          <div
            className={cn('w-2 h-2 rounded-full absolute right-0 bottom-0', {
              'bg-green': isActive,
              'bg-orange': !isActive
            })}
            style={{ marginRight: '3px', marginBottom: '3px' }}
          >
            {isActive ? null : <Icon name={'sleep'} size={9} style={{ position: 'absolute', right: -6, top: -3 }} />}
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export default Avatar;
