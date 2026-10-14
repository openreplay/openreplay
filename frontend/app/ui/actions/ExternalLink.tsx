import { ArrowUpRight } from 'lucide-react';
import type { AnchorHTMLAttributes } from 'react';

import './external-link.css';

/** The out-arrow every link that leaves the app wears. */
export function ExternalArrow({ size = 12 }: { size?: number }) {
  return (
    <ArrowUpRight
      size={size}
      strokeWidth={1.75}
      className="m-extlink__arrow"
      aria-hidden="true"
    />
  );
}

/** A link to a page outside the app: a new tab, and the out-arrow after it. */
export function ExternalLink({
  children,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      target="_blank"
      rel="noreferrer"
      {...rest}
      className={`m-extlink${className ? ` ${className}` : ''}`}
    >
      {children}
      <ExternalArrow />
    </a>
  );
}
