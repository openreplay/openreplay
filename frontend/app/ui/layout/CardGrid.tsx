import type { ReactNode } from 'react';

import './card-grid.css';

export interface CardGridProps {
  children: ReactNode;
}

export function CardGrid({ children }: CardGridProps) {
  return <div className="m-cgrid">{children}</div>;
}
