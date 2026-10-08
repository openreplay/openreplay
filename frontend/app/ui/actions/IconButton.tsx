import { Tooltip } from '@/ui/overlays/tooltip';
import { type ReactNode, forwardRef } from 'react';

import './icon-button.css';

export interface IconButtonProps {
  icon: ReactNode;

  label: string;

  count?: number;

  variant?: 'outline' | 'ghost' | 'primary';
  active?: boolean;
  open?: boolean;

  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      count = 0,
      variant = 'outline',
      active,
      open,
      pressed,
      disabled,
      onClick,
    },
    ref,
  ) {
    return (
      <Tooltip title={label} delay={350}>
        <button
          ref={ref}
          type="button"
          className={`m-iconbtn m-iconbtn--${variant}${active ? ' is-active' : ''}${
            open ? ' is-open' : ''
          }${pressed ? ' is-on' : ''}`}
          onClick={onClick}
          disabled={disabled}
          aria-label={count > 0 ? `${label}, ${count}` : label}
          aria-expanded={open}
          aria-pressed={pressed}
        >
          <span className="m-iconbtn__icon" aria-hidden="true">
            {icon}
          </span>
          {count > 0 && (
            <span className="m-iconbtn__count" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      </Tooltip>
    );
  },
);
