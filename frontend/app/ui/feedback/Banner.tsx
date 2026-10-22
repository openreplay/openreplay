import { IconButton } from '@/ui/actions/IconButton';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './banner.css';

export type BannerTone = 'danger' | 'warning' | 'info' | 'neutral';

export interface BannerProps {
  tone?: BannerTone;
  /** a 14px glyph saying what kind of message this is */
  icon?: ReactNode;
  /** the message, or several `BannerItem`s side by side */
  children: ReactNode;
  /** given, an X closes it; an announcement that stops the account has none */
  onDismiss?: () => void;
  /** what this strip is, for assistive tech ("Announcement") */
  label: string;
}

/** A thin full-width strip above the app: it pushes the app down, never covers it. */
export function Banner({
  tone = 'neutral',
  icon,
  children,
  onDismiss,
  label,
}: BannerProps) {
  const { t } = useTranslation();
  return (
    <section
      className={`m-banner m-banner--${tone}`}
      aria-label={label}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <div className="m-banner__inner">
        {icon && (
          <span className="m-banner__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="m-banner__body">{children}</div>
      </div>
      {onDismiss && (
        <span className="m-banner__close">
          <IconButton
            icon={<X size={13} />}
            label={t('Dismiss')}
            variant="ghost"
            size="xs"
            onClick={onDismiss}
          />
        </span>
      )}
    </section>
  );
}

/** One fact and its action; two sit side by side with a rule between. */
export function BannerItem({
  icon,
  children,
  action,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <span className="m-banner__item">
      {icon && (
        <span className="m-banner__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="m-banner__text">{children}</span>
      {action}
    </span>
  );
}

/** The inline action, in the strip's own ink. */
export function BannerAction({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  return href ? (
    <a
      className="m-banner__action"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ) : (
    <button type="button" className="m-banner__action" onClick={onClick}>
      {children}
    </button>
  );
}
