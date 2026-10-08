import cn from 'classnames';
import React from 'react';

export default function ({ children, className, ...props }) {
  return (
    <div
      {...props}
      className={cn('border rounded-sm bg-gray-lightest px-2 w-fit', className)}
    >
      {children}
    </div>
  );
}
