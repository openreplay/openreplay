import { Input } from '@/ui/inputs/input';
import type { KeyboardEvent, ReactNode } from 'react';

import './popover-search.css';

export interface PopoverSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;

  label?: string;

  lead?: ReactNode;
  /** After the field, inside the same row: e.g. a side panel bar's icon verbs. */
  trailing?: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;

  autoFocus?: boolean;

  className?: string;
}

export function PopoverSearch({
  placeholder,
  value,
  onChange,
  label,
  lead,
  trailing,
  onKeyDown,
  autoFocus = true,
  className,
}: PopoverSearchProps) {
  return (
    <div className={className ? `m-psearch ${className}` : 'm-psearch'}>
      {lead}
      <Input
        variant="bare"
        autoFocus={autoFocus}
        className="min-w-0 flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={label ?? placeholder}
      />
      {trailing}
    </div>
  );
}
