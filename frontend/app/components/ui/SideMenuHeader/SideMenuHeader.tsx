import React from 'react';
import cn from 'classnames';
import stl from './sideMenuHeader.css';

function SideMenuHeader(props) {
  const { text, className } = props;
	return (
    <div className={ cn(className, stl.label, "uppercase color-gray") }>
      { text }
    </div>
	)
}

export default SideMenuHeader;