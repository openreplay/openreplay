import React, { useEffect } from 'react';
import cn from 'classnames';
import stl from './bottomBlock.module.css';

let timer = null;
const BottomBlock = ({
  children = null,
  className = '',
  additionalHeight = 0,
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  ...props
}) => {
  useEffect(() => {}, []);

  return (
    <div
      className={cn(stl.wrapper, 'flex flex-col mb-2')}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

BottomBlock.displayName = 'BottomBlock';

export default BottomBlock;
