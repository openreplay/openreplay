import cn from 'classnames';
import React, { CSSProperties } from 'react';

import 'Components/Session/ReplayScreen/dev-tools.css';

function BottomBlock({
  children = null,
  className = '',
  onMouseEnter,
  onMouseLeave,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  additionalHeight?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: Partial<CSSProperties>;
}) {
  return (
    <div
      className={cn('m-dt__panel', className)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

BottomBlock.displayName = 'BottomBlock';

export default BottomBlock;
