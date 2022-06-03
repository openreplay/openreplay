import React from 'react';
import { browserIcon } from 'App/iconNames';
import { Icon } from 'UI';

const BrowserIcon = ({ browser, size="20", ...props }) => (
	<Icon name={ browserIcon(browser) } size={ size } { ...props } />
);

BrowserIcon.displayName = "BrowserIcon";

export default BrowserIcon;