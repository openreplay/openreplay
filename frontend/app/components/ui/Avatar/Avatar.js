import React from 'react';
import cn from 'classnames';
import { avatarIconName } from 'App/iconNames';
import stl from './avatar.css';
import { Icon } from 'UI';

const ICON_LIST = ['icn_chameleon', 'icn_fox', 'icn_gorilla', 'icn_hippo', 'icn_horse', 'icn_hyena',
'icn_kangaroo', 'icn_lemur', 'icn_mammel', 'icn_monkey', 'icn_moose', 'icn_panda',
'icn_penguin', 'icn_porcupine', 'icn_quail', 'icn_rabbit', 'icn_rhino', 'icn_sea_horse',
'icn_sheep', 'icn_snake', 'icn_squirrel', 'icn_tapir', 'icn_turtle', 'icn_vulture',
'icn_wild1', 'icn_wild_bore']


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
