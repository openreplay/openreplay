import { CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import './notice.css';

export type NoticeKind = 'danger' | 'success' | 'info';

export interface NoticeProps {
  kind?: NoticeKind;
  children: ReactNode;
  className?: string;
}

const ICON: Record<NoticeKind, typeof Info> = {
  danger: XCircle,
  success: CheckCircle2,
  info: Info,
};

export function Notice({ kind = 'info', children, className }: NoticeProps) {
  const Icon = ICON[kind];
  return (
    <div
      className={`m-notice m-notice--${kind}${className ? ` ${className}` : ''}`}
      role={kind === 'danger' ? 'alert' : 'status'}
      data-slot="notice"
    >
      <Icon
        size={15}
        strokeWidth={1.75}
        className="m-notice__icon"
        aria-hidden="true"
      />
      <div className="m-notice__text">{children}</div>
    </div>
  );
}
