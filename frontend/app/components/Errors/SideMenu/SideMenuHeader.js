import React from 'react';
import cn from 'classnames';
import stl from './sideMenuHeader.module.css';

function SideMenuHeader({ text, className }) {
	return (
    <div className={ cn(className, stl.label, "uppercase color-gray") }>
      { text }
    </div>
	)
}

SideMenuHeader.displayName = "SideMenuHeader";
export default SideMenuHeader;
