import React from 'react';
import cn from 'classnames';
import { CloseButton } from 'UI';
import stl from './header.module.css';
import { useStore } from 'App/mstore';

const Header = ({
  children,
  className,
  onFilterChange,
  showClose = true,
  customStyle,
  customClose,
  ...props
}) => {
  const { uiPlayerStore } = useStore();
  const closeBottomBlock = uiPlayerStore.closeBottomBlock;

  return (
    <div className={cn("relative border-r border-l py-1", stl.header)} style={customStyle}>
      <div className={cn("w-full h-full flex justify-between items-center", className)}>
        <div className="w-full flex items-center justify-between">{children}</div>
        {showClose && <CloseButton onClick={customClose ? customClose : closeBottomBlock} size="18" className="ml-2" />}
      </div>
    </div>
  )
};

Header.displayName = 'Header';

export default Header;
