import { IconButton } from '@/ui/actions/IconButton';
import { usePageSearchSlot } from '@/ui/layout/PageCard';
import { useViewport } from '@/ui/layout/use-viewport';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Input } from './input';
import './search-field.css';

export interface SearchFieldProps {
  size?: 'sm' | 'md';

  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Every list search: the magnifier, an input's height, a clear once typed in. */
export function SearchField({
  placeholder,
  value,
  onChange,
  size = 'md',
  className,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const phone = useViewport() === 'phone';
  const slot = usePageSearchSlot();
  // at phone an icon; tapped, the field covers the toolbar row it sits in
  if (phone && size !== 'sm') {
    const compact = (
      <PhoneSearch
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        inRow={!!slot}
      />
    );
    return slot ? createPortal(compact, slot) : compact;
  }
  return (
    <div className={className ? `m-search ${className}` : 'm-search'}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        aria-label={placeholder}
        prefix={<Search />}
        suffix={
          value ? (
            <IconButton
              icon={<X size={12} />}
              label={t('Clear search')}
              variant="ghost"
              size="xs"
              onClick={() => onChange('')}
            />
          ) : undefined
        }
        className={size === 'sm' ? 'text-sm' : undefined}
      />
    </div>
  );
}

function PhoneSearch({
  placeholder,
  value,
  onChange,
  inRow,
}: SearchFieldProps & { inRow: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <IconButton
        icon={<Search size={15} />}
        label={value ? `${placeholder}: ${value}` : placeholder}
        count={value ? 1 : 0}
        active={!!value}
        onClick={() => setOpen(true)}
      />
    );
  return (
    <div className={`m-phsearch${inRow ? ' is-in-row' : ''}`}>
      <Search size={16} className="m-phsearch__glyph" aria-hidden="true" />
      <Input
        autoFocus
        variant="bare"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        aria-label={placeholder}
        className="m-phsearch__input"
      />
      <IconButton
        icon={<X size={16} />}
        label={value ? t('Clear and close the search') : t('Close the search')}
        variant="ghost"
        onClick={() => {
          onChange('');
          setOpen(false);
        }}
      />
    </div>
  );
}
