import { Icon } from '@/ui/icons/Icon';
import React from 'react';

import './empty-state.css';

interface Props {
  title?: any;
  subtext?: any;
  icon?: string;
  iconSize?: number;
  size?: string;
  show?: boolean;
  children?: any;
  image?: any;
  style?: any;
  className?: string;
}

/** Legacy entry point: the kit empty state when `show`, else the children. */
export function NoContent({
  title = '',
  subtext = '',
  icon,
  iconSize,
  show,
  children,
  image,
  style,
  className,
}: Props) {
  if (!show) return children ?? null;
  return (
    <div className={`m-empty h-full ${className || ''}`} style={style}>
      {icon && <Icon name={icon as any} size={iconSize} />}
      {image && <div className="m-empty__badge">{image}</div>}
      {title && <div className="m-empty__title">{title}</div>}
      {subtext && <div className="m-empty__hint">{subtext}</div>}
    </div>
  );
}
