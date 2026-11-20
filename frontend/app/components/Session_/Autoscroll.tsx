import { clsx as cn } from 'clsx';
import React, { ReactNode, useLayoutEffect, useRef } from 'react';

/** Keeps the list pinned to its bottom after every render. */
export default function Autoscroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  });
  return (
    <div className="relative w-full h-full">
      <div className={cn('relative scroll-y h-full', className)} ref={ref}>
        {children}
      </div>
    </div>
  );
}
