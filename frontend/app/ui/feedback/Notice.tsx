import { IconButton } from '@/ui/actions/IconButton';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './notice.css';

export type NoticeKind = 'danger' | 'success' | 'info' | 'warning';

export interface NoticeProps {
  kind?: NoticeKind;
  children: ReactNode;
  /** after the sentence, in the sentence's ink */
  action?: ReactNode;
  /** a notice about a moment rather than a thing can be put away */
  onDismiss?: () => void;
  className?: string;
}

const ICON: Record<NoticeKind, typeof Info> = {
  danger: XCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

export function Notice({
  kind = 'info',
  children,
  action,
  onDismiss,
  className,
}: NoticeProps) {
  const { t } = useTranslation();
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
      <div className="m-notice__text">
        {children}
        {action && <span className="m-notice__action">{action}</span>}
      </div>
      {onDismiss && (
        <span className="m-notice__dismiss">
          <IconButton
            icon={<X size={13} />}
            label={t('Dismiss')}
            variant="ghost"
            onClick={onDismiss}
          />
        </span>
      )}
    </div>
  );
}
