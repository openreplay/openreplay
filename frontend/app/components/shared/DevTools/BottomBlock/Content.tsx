import cn from 'classnames';
import React from 'react';

function Content({
  children,
  className,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn('m-dt__content', className)} style={style}>
      {children}
    </div>
  );
}

Content.displayName = 'Content';

export default Content;
