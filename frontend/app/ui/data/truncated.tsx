import { Tooltip } from '@/ui/overlays/tooltip';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

export function Truncated({
  text,
  full,
  className,
  delay,
}: {
  text: string;
  full?: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      if (!el.isConnected) return;
      setClipped(el.scrollWidth > el.clientWidth + 0.5);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, clipped]);
  const span = (
    <span
      ref={ref}
      className={`m-truncate${className ? ` ${className}` : ''}`}
      data-clipped={clipped || undefined}
    >
      {text}
    </span>
  );
  if (!clipped && !full) return span;
  return (
    <Tooltip title={full ?? text} delay={delay}>
      {span}
    </Tooltip>
  );
}
