import React from 'react';
import cn from 'classnames';
import { avatarIconName } from 'App/iconNames';
import stl from './avatar.module.css';
import { Icon } from 'UI';

const Avatar = ({ isAssist = false, className, width = "38px", height = "38px",  iconSize = 26, seed }) => {
  var iconName = avatarIconName(seed);
  return (
    <div
        className={ cn(stl.wrapper, "p-2 border flex items-center justify-center rounded-full relative")}
        style={{ width, height }}
    >
        <Icon name={iconName} size={iconSize} color="tealx"/>
        {isAssist && <div className="w-2 h-2 bg-green rounded-full absolute right-0 bottom-0" style={{ marginRight: '3px', marginBottom: '3px'}} /> }
    </div>
  );
};

export default Avatar;
