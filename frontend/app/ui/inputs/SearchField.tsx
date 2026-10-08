import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from './input';
import './search-field.css';

export interface SearchFieldProps {
  size?: 'sm' | 'md';

  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({
  placeholder,
  value,
  onChange,
  size = 'md',
}: SearchFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="m-search relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        aria-label={placeholder}
        className={
          [value ? 'pr-6' : '', size === 'sm' ? 'h-control-sm text-sm' : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
      />
      {value && (
        <button
          type="button"
          aria-label={t('Clear search')}
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-1 flex items-center px-1 text-content-decorative hover:text-content-primary"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
