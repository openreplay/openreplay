import React from 'react';
import cn from 'classnames';
import stl from './bottomBlock.module.css';

interface Props {
  children?: React.ReactNode;
  className?: string;
  additionalHeight?: number;
}

function BottomBlock({
  children = null,
  className = '',
  additionalHeight = 0,
  ...props
}: Props) {
  return (
    <div className={cn(stl.wrapper, 'flex flex-col mb-2')} {...props}>
      {children}
    </div>
  );
}

BottomBlock.displayName = 'BottomBlock';

export default BottomBlock;
