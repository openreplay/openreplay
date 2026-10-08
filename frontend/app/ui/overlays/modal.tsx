import { cn } from '@/lib/utils';
import { Button } from '@/ui/actions/button';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface ModalProps {
  title: ReactNode;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  okText?: string;
  okDisabled?: boolean;
  cancelText?: string;

  okVariant?: 'primary' | 'danger';

  footer?: ReactNode | null;
  width?: number;

  className?: string;
  children: ReactNode;
}

export function Modal({
  title,
  open,
  onCancel,
  onOk,
  okText,
  okDisabled,
  okVariant = 'primary',
  cancelText,
  footer,
  width = 440,
  className,
  children,
}: ModalProps) {
  const { t } = useTranslation();
  return (
    <D.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <D.Portal>
        <D.Overlay className="m-scrim fixed inset-0 z-[var(--m-z-overlay)] bg-[var(--m-scrim)]" />
        <D.Content
          style={{ width }}
          className={cn(
            'm-dialog fixed left-1/2 top-1/2 z-[var(--m-z-modal)] max-h-[85vh] w-full -translate-x-1/2 -translate-y-1/2',
            'overflow-auto rounded-surface border border-border-subtle bg-surface-default',
            'm-elevated-modal outline-none',
            className,
          )}
          data-slot="modal"
        >
          <div className="px-7 pt-7">
            <D.Title className="pr-7 text-lg font-semibold leading-normal">
              {title}
            </D.Title>
          </div>
          <D.Close asChild>
            <button
              type="button"
              aria-label={t('Close')}
              className="m-hover absolute right-5 top-5 flex size-6 items-center justify-center rounded-control text-content-decorative hover:bg-surface-hover hover:text-content-primary"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </D.Close>
          <div className="px-7 py-6">{children}</div>
          {footer !== null && (
            <div className="m-modal__foot flex items-center justify-end gap-4 px-7 pb-7">
              {footer ?? (
                <>
                  <Button onClick={onCancel}>
                    {cancelText ?? t('Cancel')}
                  </Button>
                  {onOk && (
                    <Button
                      variant={okVariant}
                      disabled={okDisabled}
                      onClick={onOk}
                    >
                      {okText ?? t('OK')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
