import { cn } from '@/lib/utils';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input, type InputProps } from './input';

export interface PasswordInputProps extends Omit<
  InputProps,
  'type' | 'suffix'
> {
  mark?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ mark = false, className, ...props }, ref) {
    const { t } = useTranslation();
    const [shown, setShown] = useState(false);
    return (
      <Input
        ref={ref}
        type={shown ? 'text' : 'password'}
        prefix={mark ? <KeyRound /> : undefined}
        className={className}
        suffix={
          <Tooltip
            title={shown ? t('Hide password') : t('Show password')}
            delay={400}
          >
            <button
              type="button"
              className={cn(
                'm-hover inline-flex size-[var(--m-control-height-sm)] items-center justify-center rounded-control',
                shown
                  ? 'text-content-primary'
                  : 'text-content-placeholder hover:text-content-secondary',
                'hover:bg-[var(--m-action-subtle-bg-hover)] disabled:pointer-events-none disabled:opacity-50',
              )}
              aria-label={shown ? t('Hide password') : t('Show password')}
              aria-pressed={shown}
              disabled={props.disabled}
              tabIndex={-1}
              onClick={() => setShown((v) => !v)}
            >
              {shown ? (
                <EyeOff size={15} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </Tooltip>
        }
        {...props}
      />
    );
  },
);
