import { Tooltip } from 'antd';
import cn from 'classnames';
import React from 'react';
import { connect } from 'react-redux';

import { closeBottomBlock } from 'Duck/components/player';
import { CloseButton } from 'UI';

import stl from './header.module.css';

const Header = ({
  children,
  className,
  closeBottomBlock,
  onClose,
  onFilterChange,
  showClose = true,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  closeBottomBlock?: () => void;
  onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showClose?: boolean;
  onClose?: () => void;
}) => (
  <div className={cn('relative border-r border-l py-1', stl.header)}>
    <div
      className={cn(
        'w-full h-full flex justify-between items-center',
        className
      )}
    >
      <div className="w-full flex items-center justify-between">{children}</div>
      {showClose && (
        <Tooltip title="Close Panel">
          <CloseButton
            onClick={onClose ? onClose : closeBottomBlock}
            size="18"
            className="ml-2 hover:bg-black/10 rounded-lg p-1"
          />
        </Tooltip>
      )}
    </div>
  </div>
);

Header.displayName = 'Header';

export default connect(null, { closeBottomBlock })(Header);
