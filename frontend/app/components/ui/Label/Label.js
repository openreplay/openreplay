import React from 'react';
import cn from 'classnames';

export default function ({ children, className, ...props }) {
  return (
    <div
      {...props}
      className={cn('border rounded bg-gray-lightest px-2 w-fit', className)}
    >
      {children}
    </div>
  );
}
