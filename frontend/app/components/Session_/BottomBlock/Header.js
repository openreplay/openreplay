import React from 'react';
import cn from 'classnames';
import { CloseButton } from 'UI';
import { useStore } from 'App/mstore';
import stl from './header.module.css';

function Header({
  children,
  className,
  onFilterChange,
  showClose = true,
  customStyle,
  customClose,
  ...props
}) {
  const { uiPlayerStore } = useStore();
  const { closeBottomBlock } = uiPlayerStore;

  return (
    <div
      className={cn('relative border-r border-l py-1', stl.header)}
      style={customStyle}
    >
      <div
        className={cn(
          'w-full h-full flex justify-between items-center',
          className,
        )}
      >
        <div className="w-full flex items-center justify-between">
          {children}
        </div>
        {showClose && (
          <CloseButton
            onClick={customClose || closeBottomBlock}
            size="18"
            className="ml-2"
          />
        )}
      </div>
    </div>
  );
}

Header.displayName = 'Header';

export default Header;
