import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { closeBottomBlock } from 'Duck/components/player';
import { Input, CloseButton } from 'UI';
import stl from './header.module.css';

const Header = ({
  children,
  className,
  closeBottomBlock,
  onFilterChange,
  showClose = true,
  ...props
}) => (
  <div className={ cn("relative border-r border-l py-1", stl.header) } >
    <div className={ cn("w-full h-full flex justify-between items-center", className) } >
      <div className="w-full flex items-center justify-between">{ children }</div>
      { showClose && <CloseButton onClick={ closeBottomBlock } size="18" className="ml-2" /> }
    </div>
  </div>
);

Header.displayName = 'Header';

export default connect(null, { closeBottomBlock })(Header);
