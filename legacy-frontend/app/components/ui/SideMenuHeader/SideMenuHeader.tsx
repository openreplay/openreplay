import React from 'react';
import cn from 'classnames';
import stl from './sideMenuHeader.module.css';

function SideMenuHeader(props) {
  const { text, className, button } = props;
	return (
    <div className={cn(className, 'flex items-center')}>
      <div className={ cn(stl.label, "uppercase color-gray") }>
        { text }
      </div>
      <div>{button}</div>
    </div>
	)
}

export default SideMenuHeader;
