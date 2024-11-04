import React, { CSSProperties, useEffect } from 'react';
import cn from 'classnames';
import stl from './bottomBlock.module.css';

const BottomBlock = ({
  children = null,
  className = '',
  additionalHeight = 0,
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  additionalHeight?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: Partial<CSSProperties>;
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
