import React from 'react';
import { browserIcon } from 'App/iconNames';
import { Icon } from 'UI';

function BrowserIcon({ browser, size = '20', ...props }) {
  return <Icon name={browserIcon(browser)} size={size} {...props} />;
}

BrowserIcon.displayName = 'BrowserIcon';

export default BrowserIcon;
