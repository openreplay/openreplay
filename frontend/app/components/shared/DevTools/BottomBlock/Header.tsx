import { Tooltip } from 'antd';
import cn from 'classnames';
import React from 'react';

import { useStore } from 'App/mstore';
import { CloseButton } from 'UI';

import stl from './header.module.css';

function Header({
  children,
  className,
  onClose,
  onFilterChange,
  showClose = true,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const { uiPlayerStore } = useStore();
  const { closeBottomBlock } = uiPlayerStore;
  return (
    <div className={cn('relative border-r border-l py-1', stl.header)}>
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
          <Tooltip title="Close Panel">
            <CloseButton
              onClick={onClose || closeBottomBlock}
              size="18"
              className="ml-2 hover:bg-black/10 rounded-lg p-1"
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

Header.displayName = 'Header';

export default Header;
