import React from 'react';
import cn from 'classnames';
import stl from './content.module.css';

const Content = ({
  children,
  className,
  ...props
}: { children?: React.ReactNode; className?: string }) => (
  <div className={ cn(className, stl.content) } { ...props } >
    { children }
  </div>
);

Content.displayName = 'Content';

export default Content;
