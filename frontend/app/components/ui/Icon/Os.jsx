import { osIcon } from 'App/iconNames';
import { Icon } from 'UI';
import React from 'react';

function OsIcon({ os, size = '20', ...props }) {
  return <Icon name={osIcon(os)} size={size} {...props} />;
}

OsIcon.displayName = 'OsIcon';

export default OsIcon;
